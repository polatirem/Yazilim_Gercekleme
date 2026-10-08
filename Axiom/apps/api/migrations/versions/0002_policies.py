"""Versioned policies and executions."""
from alembic import op
import sqlalchemy as sa
revision="0002"; down_revision="0001"; branch_labels=None; depends_on=None
def upgrade():
    op.create_table("policies",sa.Column("id",sa.String(36),primary_key=True),sa.Column("project_id",sa.String(36),sa.ForeignKey("projects.id"),nullable=False,index=True),sa.Column("name",sa.String(200),nullable=False),sa.Column("enabled",sa.Boolean(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False))
    op.create_table("policy_versions",sa.Column("id",sa.String(36),primary_key=True),sa.Column("policy_id",sa.String(36),sa.ForeignKey("policies.id",ondelete="CASCADE"),nullable=False,index=True),sa.Column("version",sa.Integer(),nullable=False),sa.Column("rules_json",sa.JSON(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False),sa.UniqueConstraint("policy_id","version"))
    op.create_table("policy_executions",sa.Column("id",sa.String(36),primary_key=True),sa.Column("request_id",sa.String(36),sa.ForeignKey("requests.id",ondelete="CASCADE"),nullable=False,unique=True),sa.Column("policy_version_id",sa.String(36),sa.ForeignKey("policy_versions.id")),sa.Column("action",sa.String(30),nullable=False),sa.Column("matched_rule_json",sa.JSON(),nullable=False),sa.Column("reason",sa.Text(),nullable=False),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False))
def downgrade():
    op.drop_table("policy_executions");op.drop_table("policy_versions");op.drop_table("policies")
