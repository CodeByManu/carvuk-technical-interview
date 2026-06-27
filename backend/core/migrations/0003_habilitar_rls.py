"""Habilita Row Level Security (RLS) en las tablas de dominio.

Supabase expone una Data API (PostgREST) sobre el schema `public`, accesible con
la anon key. Sin RLS, cualquiera con esa key podría leer/escribir nuestras tablas
saltándose el backend. Nosotros no usamos esa API —Django entra directo al
Postgres como rol `postgres`, que tiene BYPASSRLS— así que activar RLS sin
políticas (deny-all) cierra la Data API para los roles `anon`/`authenticated` y
no afecta en nada a Django.
"""
from django.db import migrations


TABLAS = ["core_producto", "core_boleta", "core_lineaboleta"]


def _aplicar(accion: str):
    """Devuelve una función de migración que activa/desactiva RLS en Postgres.

    Es no-op fuera de Postgres (p. ej. el SQLite que usamos en tests), donde RLS
    no existe.
    """

    def run(apps, schema_editor):
        if schema_editor.connection.vendor != "postgresql":
            return
        with schema_editor.connection.cursor() as cursor:
            for tabla in TABLAS:
                cursor.execute(f"ALTER TABLE {tabla} {accion} ROW LEVEL SECURITY;")

    return run


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_seed_productos"),
    ]

    operations = [
        migrations.RunPython(_aplicar("ENABLE"), _aplicar("DISABLE")),
    ]
