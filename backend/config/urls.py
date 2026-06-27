"""URL configuration for the config project.

La API de django-ninja se monta completa bajo el prefijo /api.
"""
from django.contrib import admin
from django.urls import path

from core.api import api

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", api.urls),
]
