from django.db import migrations

INDEX_NAME = "monitoring__website_4c5479_idx"


def ensure_uptime_history_index(apps, schema_editor):
    model = apps.get_model("monitoring", "UptimeCheck")
    client = schema_editor.connection.connection
    database = client[schema_editor.connection.settings_dict["NAME"]]
    database[model._meta.db_table].create_index(
        [("website_id", 1), ("checked_at", 1)],
        name=INDEX_NAME,
    )


class Migration(migrations.Migration):
    dependencies = [("monitoring", "0001_initial")]

    operations = [
        migrations.RunPython(ensure_uptime_history_index, migrations.RunPython.noop),
    ]
