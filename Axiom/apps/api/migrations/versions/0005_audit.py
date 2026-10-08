"""Administrative audit events."""
from alembic import op
import sqlalchemy as sa
revision="0005";down_revision="0004";branch_labels=None;depends_on=None
def upgrade():
    op.create_table("audit_events",sa.Column("id",sa.String(36),primary_key=True),sa.Column("organization_id",sa.String(36),sa.ForeignKey("organizations.id"),nullable=False,index=True),sa.Column("actor_id",sa.String(36),nullable=False),sa.Column("action",sa.String(100),nullable=False,index=True),sa.Column("resource_type",sa.String(80),nullable=False),sa.Column("resource_id",sa.String(36),nullable=False),sa.Column("metadata_json",sa.JSON(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False))
def downgrade():op.drop_table("audit_events")
