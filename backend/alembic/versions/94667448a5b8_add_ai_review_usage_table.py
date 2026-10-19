"""add_ai_review_usage_table

Revision ID: 94667448a5b8
Revises: 8e18a6911568
Create Date: 2026-10-19 11:46:08.775568

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94667448a5b8'
down_revision: Union[str, Sequence[str], None] = '8e18a6911568'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'ai_review_usage' not in tables:
        op.create_table(
            'ai_review_usage',
            sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
            sa.Column('window_start', sa.DateTime(timezone=True), nullable=False),
            sa.Column('count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('blocked_attempts', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('penalty_until', sa.DateTime(timezone=True), nullable=True),
            sa.Column('daily_count', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('daily_window_start', sa.DateTime(timezone=True), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index('idx_ai_review_usage_user_id', 'ai_review_usage', ['user_id'])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()
    if 'ai_review_usage' in tables:
        op.drop_index('idx_ai_review_usage_user_id', table_name='ai_review_usage')
        op.drop_table('ai_review_usage')
