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


def _sql(accion: str) -> str:
    # accion: "ENABLE" o "DISABLE"
    return "".join(
        f"ALTER TABLE {tabla} {accion} ROW LEVEL SECURITY;\n" for tabla in TABLAS
    )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_seed_productos"),
    ]

    operations = [
        migrations.RunSQL(
            sql=_sql("ENABLE"),
            reverse_sql=_sql("DISABLE"),
        ),
    ]
