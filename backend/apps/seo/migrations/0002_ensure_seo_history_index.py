from django.db import migrations

INDEX_NAME = "seo_seoaudi_website_904774_idx"


def ensure_seo_history_index(apps, schema_editor):
    model = apps.get_model("seo", "SEOAudit")
    client = schema_editor.connection.connection
    database = client[schema_editor.connection.settings_dict["NAME"]]
    database[model._meta.db_table].create_index(
        [("website_id", 1), ("checked_at", 1)],
        name=INDEX_NAME,
    )


class Migration(migrations.Migration):
    dependencies = [("seo", "0001_initial")]

    operations = [
        migrations.RunPython(ensure_seo_history_index, migrations.RunPython.noop),
    ]
