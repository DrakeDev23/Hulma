"""add_portfolio_project_photos_table

Revision ID: b37a54e69a7c
Revises: 94667448a5b8
Create Date: 2026-11-02 17:33:04.574652

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b37a54e69a7c'
down_revision: Union[str, Sequence[str], None] = '94667448a5b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'portfolio_project_photos' not in tables:
        op.create_table(
            'portfolio_project_photos',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('portfolio_id', sa.Integer(), sa.ForeignKey('portfolios.id', ondelete='CASCADE'), nullable=False),
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
            sa.Column('project_name', sa.String(length=200), nullable=True),
            sa.Column('project_index', sa.Integer(), nullable=True),
            sa.Column('photo_url', sa.String(length=1000), nullable=False),
            sa.Column('storage_path', sa.String(length=500), nullable=True),
            sa.Column('caption', sa.String(length=255), nullable=True),
            sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        )
        op.create_index('ix_portfolio_project_photos_id', 'portfolio_project_photos', ['id'])
        op.create_index('ix_portfolio_project_photos_portfolio_id', 'portfolio_project_photos', ['portfolio_id'])
        op.create_index('ix_portfolio_project_photos_user_id', 'portfolio_project_photos', ['user_id'])
        op.create_index('idx_project_photos_portfolio_project', 'portfolio_project_photos', ['portfolio_id', 'project_name'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'portfolio_project_photos' in tables:
        op.drop_index('idx_project_photos_portfolio_project', table_name='portfolio_project_photos')
        op.drop_index('ix_portfolio_project_photos_user_id', table_name='portfolio_project_photos')
        op.drop_index('ix_portfolio_project_photos_portfolio_id', table_name='portfolio_project_photos')
        op.drop_index('ix_portfolio_project_photos_id', table_name='portfolio_project_photos')
        op.drop_table('portfolio_project_photos')
