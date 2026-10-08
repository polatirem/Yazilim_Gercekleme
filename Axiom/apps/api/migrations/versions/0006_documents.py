"""Knowledge base documents and retrievable chunks."""
from alembic import op
import sqlalchemy as sa
revision="0006";down_revision="0005";branch_labels=None;depends_on=None
def upgrade():
    op.create_table("documents",sa.Column("id",sa.String(36),primary_key=True),sa.Column("organization_id",sa.String(36),sa.ForeignKey("organizations.id"),nullable=False,index=True),sa.Column("project_id",sa.String(36),sa.ForeignKey("projects.id"),nullable=False,index=True),sa.Column("title",sa.String(300),nullable=False),sa.Column("filename",sa.String(300)),sa.Column("content_type",sa.String(40),nullable=False),sa.Column("char_count",sa.Integer(),nullable=False),sa.Column("page_count",sa.Integer()),sa.Column("created_at",sa.DateTime(timezone=True),nullable=False))
    op.create_table("document_chunks",sa.Column("id",sa.String(36),primary_key=True),sa.Column("document_id",sa.String(36),sa.ForeignKey("documents.id",ondelete="CASCADE"),nullable=False,index=True),sa.Column("position",sa.Integer(),nullable=False),sa.Column("page",sa.Integer()),sa.Column("text",sa.Text(),nullable=False))
def downgrade():
    op.drop_table("document_chunks");op.drop_table("documents")
