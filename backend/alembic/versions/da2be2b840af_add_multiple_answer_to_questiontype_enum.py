"""add_multiple_answer_to_questiontype_enum

Revision ID: da2be2b840af
Revises: 1b928666719e
Create Date: 2026-01-23 10:30:18.256370

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = 'da2be2b840af'
down_revision = '1b928666719e'
branch_labels = None
depends_on = None


def upgrade():
    # Add MULTIPLE_ANSWER to the questiontype enum
    op.execute("ALTER TYPE questiontype ADD VALUE 'MULTIPLE_ANSWER'")


def downgrade():
    # PostgreSQL doesn't support removing enum values directly
    # This would require recreating the enum type, which is complex
    # and risky with existing data
    pass
