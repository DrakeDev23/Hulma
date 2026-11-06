import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4
import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from app.config import settings
from app.deps import get_db
from app.models import Portfolio, PortfolioProjectPhoto, User
from app.schemas import PortfolioImageDeleteResponse, PortfolioImageUploadResponse, ProjectPhotoRead, _is_safe_url
from app.routers.portfolio_auth import get_current_profile, get_owned_portfolio
from app.routers.portfolio_core import _new_slug
logger = logging.getLogger(__name__)
router = APIRouter(prefix='/portfolio', tags=['portfolio'])
ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/webp'}
MAX_IMAGE_BYTES = settings.max_image_size_mb * 1024 * 1024
_UPLOAD_READ_CHUNK = 64 * 1024

async def _read_upload_limited(file: UploadFile, max_bytes: int) -> bytes:
    chunks: list[bytes] = []
    total = 0
    while True:
        chunk = await file.read(_UPLOAD_READ_CHUNK)
        if not chunk:
            break
        total += len(chunk)
        if total > max_bytes:
            try:
                while await file.read(_UPLOAD_READ_CHUNK):
                    pass
            except Exception:
                pass
            raise HTTPException(status_code=getattr(status, 'HTTP_413_CONTENT_TOO_LARGE', status.HTTP_413_REQUEST_ENTITY_TOO_LARGE), detail=f'Image is too large. Maximum size is {settings.max_image_size_mb} MB.')
        chunks.append(chunk)
    return b''.join(chunks)

async def _delete_storage_object(object_path: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.delete(f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{object_path}", headers={**_get_service_headers()})
    except Exception as exc:
        logger.warning("Failed to clean up storage object '%s': %s", object_path, exc)

def _png_dimensions(content: bytes) -> tuple[int, int] | None:
    if len(content) < 24 or not content.startswith(b'\x89PNG\r\n\x1a\n'):
        return None
    if content[12:16] != b'IHDR':
        return None
    width = int.from_bytes(content[16:20], 'big')
    height = int.from_bytes(content[20:24], 'big')
    return (width, height)

def _jpeg_dimensions(content: bytes) -> tuple[int, int] | None:
    if len(content) < 4 or not content.startswith(b'\xff\xd8'):
        return None
    i = 2
    while i + 9 < len(content):
        if content[i] != 255:
            i += 1
            continue
        marker = content[i + 1]
        i += 2
        if marker in {216, 217}:
            continue
        if i + 2 > len(content):
            break
        seg_len = int.from_bytes(content[i:i + 2], 'big')
        if seg_len < 2 or i + seg_len > len(content):
            break
        if marker in {192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207}:
            if i + 7 >= len(content):
                return None
            height = int.from_bytes(content[i + 3:i + 5], 'big')
            width = int.from_bytes(content[i + 5:i + 7], 'big')
            return (width, height)
        i += seg_len
    return None

def _webp_dimensions(content: bytes) -> tuple[int, int] | None:
    if len(content) < 30 or not (content.startswith(b'RIFF') and content[8:12] == b'WEBP'):
        return None
    chunk = content[12:16]
    if chunk == b'VP8X' and len(content) >= 30:
        width = 1 + int.from_bytes(content[24:27], 'little')
        height = 1 + int.from_bytes(content[27:30], 'little')
        return (width, height)
    if chunk == b'VP8 ' and len(content) >= 30:
        start = content.find(b'\x9d\x01*')
        if start != -1 and start + 7 < len(content):
            width = int.from_bytes(content[start + 3:start + 5], 'little') & 16383
            height = int.from_bytes(content[start + 5:start + 7], 'little') & 16383
            return (width, height)
    if chunk == b'VP8L' and len(content) >= 25:
        bits = int.from_bytes(content[21:25], 'little')
        width = (bits & 16383) + 1
        height = (bits >> 14 & 16383) + 1
        return (width, height)
    return None

def _validate_image_dimensions(content: bytes, mime: str) -> None:
    dims = None
    if mime == 'image/png':
        dims = _png_dimensions(content)
    elif mime == 'image/jpeg':
        dims = _jpeg_dimensions(content)
    elif mime == 'image/webp':
        dims = _webp_dimensions(content)
    if dims is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Could not read image dimensions. File may be truncated or malformed.')
    width, height = dims
    max_dim = max(1, int(settings.max_image_dimension_px))
    if width <= 0 or height <= 0 or width > max_dim or (height > max_dim):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f'Image dimensions are invalid or exceed {max_dim}px.')

def _validate_image_magic_bytes(content: bytes) -> str:
    if len(content) < 12:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='File is too small to be a valid image.')
    if content.startswith(b'\xff\xd8\xff'):
        mime = 'image/jpeg'
    elif content.startswith(b'\x89PNG\r\n\x1a\n'):
        mime = 'image/png'
    elif content.startswith(b'RIFF') and content[8:12] == b'WEBP':
        mime = 'image/webp'
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid image format. Only authentic JPEG, PNG, or WebP files are allowed.')
    _validate_image_dimensions(content, mime)
    return mime

def _supabase_public_url(object_path: str) -> str:
    base_url = settings.supabase_url.rstrip('/')
    bucket = settings.supabase_bucket.strip('/')
    return f"{base_url}/storage/v1/object/public/{bucket}/{object_path.lstrip('/')}"

def _normalize_object_path(value: str) -> str | None:
    if not value:
        return None
    if 'storage/v1/object/public/' in value:
        value = value.split('storage/v1/object/public/', 1)[1]
    if value.startswith(f'{settings.supabase_bucket}/'):
        value = value[len(settings.supabase_bucket) + 1:]
    value = value.lstrip('/')
    return value or None

def _get_service_headers() -> dict[str, str]:
    service_key = settings.supabase_service_role_key or settings.supabase_key
    if not service_key:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='SUPABASE_SERVICE_ROLE_KEY is not configured on the backend.')
    return {'Authorization': f'Bearer {service_key}', 'apikey': service_key}

def _assert_storage_path_owned(object_path: str | None, user_id: int) -> None:
    if not object_path:
        return
    user_prefix = f'{user_id}/'
    if '..' in object_path or object_path.startswith('/') or '\\' in object_path or ('\x00' in object_path) or (not object_path.startswith(user_prefix)) or (not re.fullmatch('[A-Za-z0-9._/-]+', object_path)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You can only use your own uploaded images.')

@router.post('/images/upload', response_model=PortfolioImageUploadResponse)
async def upload_portfolio_image(file: UploadFile=File(...), portfolio_id: int=Query(..., description='Owned portfolio ID to attach the image to (required)'), template_id: Optional[str]=Query(None, description='Optional template ID of portfolio'), project_name: Optional[str]=Query(None, description='Optional project name/title to attach image to'), project_index: Optional[int]=Query(None, description='Optional project index in portfolio projects list'), is_project_photo: Optional[bool]=Query(False, description='Set to true if this image is a project photo'), user: User=Depends(get_current_profile), db: Session=Depends(get_db)) -> PortfolioImageUploadResponse:
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='A file is required.')
    if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Only JPEG, PNG, and WebP images are allowed.')
    target_portfolio = get_owned_portfolio(db, portfolio_id, user.id)
    content = await _read_upload_limited(file, MAX_IMAGE_BYTES)
    canonical_mime = _validate_image_magic_bytes(content)
    ext_map = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}
    ext = ext_map.get(canonical_mime, '.jpg')
    object_path = f'{user.id}/{uuid4().hex}{ext}'
    storage_url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{object_path}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(storage_url, headers={**_get_service_headers(), 'Content-Type': canonical_mime, 'x-upsert': 'true'}, content=content)
            if response.status_code >= 400:
                logger.error('Supabase upload returned error %s: %s', response.status_code, response.text)
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='Image storage service failed to save the upload.')
    except HTTPException:
        raise
    except Exception as exc:
        logger.error('Image upload failed with exception: %s', exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Failed to upload image. Please try again.') from exc
    public_url = _supabase_public_url(object_path)
    clean_project_name = re.sub('[\\x00-\\x1f\\x7f]', '', project_name.strip())[:200] if project_name else None
    try:
        if is_project_photo or project_name is not None or project_index is not None:
            photo_record = PortfolioProjectPhoto(portfolio_id=target_portfolio.id, user_id=user.id, project_name=clean_project_name, project_index=project_index, photo_url=public_url, storage_path=object_path)
            db.add(photo_record)
            projects = list(target_portfolio.projects or [])
            updated = False
            if project_index is not None and 0 <= project_index < len(projects):
                p = dict(projects[project_index]) if isinstance(projects[project_index], dict) else {'name': str(projects[project_index])}
                p['image'] = public_url
                projects[project_index] = p
                updated = True
            elif clean_project_name:
                for i, p in enumerate(projects):
                    if isinstance(p, dict) and (p.get('name') == clean_project_name or p.get('title') == clean_project_name):
                        p_copy = dict(p)
                        p_copy['image'] = public_url
                        projects[i] = p_copy
                        updated = True
                        break
            if updated:
                target_portfolio.projects = projects
                flag_modified(target_portfolio, 'projects')
        else:
            sections = dict(target_portfolio.sections or {})
            profile = dict(sections.get('profile') or {})
            profile['profilePicture'] = public_url
            sections['profile'] = profile
            target_portfolio.sections = sections
            flag_modified(target_portfolio, 'sections')
        if not target_portfolio.slug:
            target_portfolio.slug = _new_slug(db)
        target_portfolio.updated_at = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        db.rollback()
        await _delete_storage_object(object_path)
        raise
    return PortfolioImageUploadResponse(url=public_url, path=object_path, bucket=settings.supabase_bucket)

@router.delete('/images/{image_path:path}', response_model=PortfolioImageDeleteResponse)
async def delete_portfolio_image(image_path: str, user: User=Depends(get_current_profile), db: Session=Depends(get_db)) -> PortfolioImageDeleteResponse:
    object_path = _normalize_object_path(image_path)
    if not object_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Invalid image path.')
    try:
        _assert_storage_path_owned(object_path, user.id)
    except HTTPException as exc:
        if exc.status_code == status.HTTP_403_FORBIDDEN:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='You can only delete your own portfolio images.') from exc
        raise
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{object_path}", headers={**_get_service_headers()})
            if response.status_code >= 400 and response.status_code != 404:
                logger.error('Supabase delete returned error %s: %s', response.status_code, response.text)
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='Image storage service could not complete image deletion.')
    except HTTPException:
        raise
    except Exception as exc:
        logger.error('Image delete failed with exception: %s', exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Failed to delete image. Please try again.') from exc
    user_portfolios = db.query(Portfolio).filter(Portfolio.user_id == user.id).all()
    for portfolio in user_portfolios:
        if isinstance(portfolio.sections, dict):
            profile = portfolio.sections.get('profile', {})
            if isinstance(profile, dict) and _normalize_object_path(profile.get('profilePicture') or '') == object_path:
                sections = dict(portfolio.sections)
                prof = dict(profile)
                prof['profilePicture'] = ''
                sections['profile'] = prof
                portfolio.sections = sections
                flag_modified(portfolio, 'sections')
                portfolio.updated_at = datetime.now(timezone.utc)
    db.commit()
    return PortfolioImageDeleteResponse(deleted=True, path=object_path)

@router.post('/{portfolio_id}/project-photos', response_model=ProjectPhotoRead)
async def add_project_photo(portfolio_id: int, file: Optional[UploadFile]=File(None), photo_url: Optional[str]=Form(None), project_name: Optional[str]=Form(None), project_index: Optional[int]=Form(None), caption: Optional[str]=Form(None), display_order: int=Form(0), user: User=Depends(get_current_profile), db: Session=Depends(get_db)) -> PortfolioProjectPhoto:
    portfolio = get_owned_portfolio(db, portfolio_id, user.id)
    final_url = photo_url
    object_path = None
    if file and file.filename:
        if file.content_type and file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Only JPEG, PNG, and WebP images are allowed.')
        content = await _read_upload_limited(file, MAX_IMAGE_BYTES)
        canonical_mime = _validate_image_magic_bytes(content)
        ext_map = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}
        ext = ext_map.get(canonical_mime, '.jpg')
        object_path = f'{user.id}/projects/{uuid4().hex}{ext}'
        storage_url = f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{object_path}"
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(storage_url, headers={**_get_service_headers(), 'Content-Type': canonical_mime, 'x-upsert': 'true'}, content=content)
                if response.status_code >= 400:
                    logger.error('Supabase upload returned error %s: %s', response.status_code, response.text)
                    raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail='Image storage service failed to save the upload.')
        except HTTPException:
            raise
        except Exception as exc:
            logger.error('Project image upload failed: %s', exc, exc_info=True)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Failed to upload project photo.') from exc
        final_url = _supabase_public_url(object_path)
    if not final_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Either an image file or photo_url is required.')
    if not _is_safe_url(final_url):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Unsafe URL provided.')
    if not object_path:
        object_path = _normalize_object_path(final_url)
    bucket = (settings.supabase_bucket or '').strip('/')
    if object_path and bucket and (f'/object/public/{bucket}/' in final_url or f'/object/{bucket}/' in final_url):
        _assert_storage_path_owned(object_path, user.id)
    clean_project_name = re.sub('[\\x00-\\x1f\\x7f]', '', project_name.strip())[:200] if project_name else None
    clean_caption = re.sub('[\\x00-\\x1f\\x7f]', '', caption.strip())[:255] if caption else None
    try:
        photo_record = PortfolioProjectPhoto(portfolio_id=portfolio.id, user_id=user.id, project_name=clean_project_name, project_index=project_index, photo_url=final_url, storage_path=object_path, caption=clean_caption, display_order=display_order)
        db.add(photo_record)
        projects = list(portfolio.projects or [])
        updated = False
        if project_index is not None and 0 <= project_index < len(projects):
            p = dict(projects[project_index]) if isinstance(projects[project_index], dict) else {'name': str(projects[project_index])}
            p['image'] = final_url
            projects[project_index] = p
            updated = True
        elif project_name:
            for i, p in enumerate(projects):
                if isinstance(p, dict) and (p.get('name') == project_name or p.get('title') == project_name):
                    p_copy = dict(p)
                    p_copy['image'] = final_url
                    projects[i] = p_copy
                    updated = True
                    break
        if updated:
            portfolio.projects = projects
            flag_modified(portfolio, 'projects')
        portfolio.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(photo_record)
    except Exception:
        db.rollback()
        if object_path and file and file.filename:
            await _delete_storage_object(object_path)
        raise
    return photo_record

@router.get('/{portfolio_id}/project-photos', response_model=list[ProjectPhotoRead])
def list_project_photos(portfolio_id: int, user: User=Depends(get_current_profile), db: Session=Depends(get_db)) -> list[PortfolioProjectPhoto]:
    get_owned_portfolio(db, portfolio_id, user.id)
    return db.query(PortfolioProjectPhoto).filter(PortfolioProjectPhoto.portfolio_id == portfolio_id, PortfolioProjectPhoto.user_id == user.id).order_by(PortfolioProjectPhoto.display_order.asc(), PortfolioProjectPhoto.id.asc()).all()

@router.delete('/project-photos/{photo_id}')
async def delete_project_photo(photo_id: int, user: User=Depends(get_current_profile), db: Session=Depends(get_db)):
    photo = db.query(PortfolioProjectPhoto).filter(PortfolioProjectPhoto.id == photo_id, PortfolioProjectPhoto.user_id == user.id).first()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Project photo not found or access denied.')
    if photo.storage_path:
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                await client.delete(f"{settings.supabase_url.rstrip('/')}/storage/v1/object/{settings.supabase_bucket}/{photo.storage_path}", headers={**_get_service_headers()})
        except Exception as exc:
            logger.warning('Could not delete project photo from storage: %s', exc)
    db.delete(photo)
    db.commit()
    return {'deleted': True, 'id': photo_id}
