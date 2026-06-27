"""Siembra el catálogo de la tienda con productos de ejemplo.

Precios en CLP (pesos chilenos), aproximados a valores reales de supermercado de
barrio. El catálogo es global y de solo lectura para los usuarios.
"""
from django.db import migrations


# (nombre, precio en CLP)
PRODUCTOS = [
    ("Leche entera 1 L", 1100),
    ("Pan marraqueta 1 kg", 1800),
    ("Aceite vegetal 1 L", 2000),
    ("Arroz grado 2, 1 kg", 1500),
    ("Azúcar 1 kg", 1200),
    ("Harina sin polvos 1 kg", 1300),
    ("Fideos spaghetti 400 g", 900),
    ("Huevos, docena", 3500),
    ("Mantequilla 250 g", 2800),
    ("Queso gauda 250 g", 3200),
    ("Jamón de pavo 200 g", 2500),
    ("Café instantáneo 170 g", 4500),
    ("Té, 20 bolsitas", 1600),
    ("Sal de mesa 1 kg", 700),
    ("Mermelada de frutilla 250 g", 1900),
    ("Atún en agua, lata 170 g", 1400),
    ("Detergente líquido 1 L", 3900),
    ("Papel higiénico, 4 rollos", 2600),
    ("Agua mineral 1.5 L", 800),
    ("Bebida cola 1.5 L", 1700),
    ("Yogurt natural 1 L", 1500),
    ("Plátano 1 kg", 1300),
]


def crear_productos(apps, schema_editor):
    Producto = apps.get_model("core", "Producto")
    Producto.objects.bulk_create(
        [Producto(nombre=nombre, precio=precio) for nombre, precio in PRODUCTOS]
    )


def borrar_productos(apps, schema_editor):
    Producto = apps.get_model("core", "Producto")
    Producto.objects.filter(nombre__in=[nombre for nombre, _ in PRODUCTOS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(crear_productos, borrar_productos),
    ]
