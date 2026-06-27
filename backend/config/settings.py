"""
Django settings for the config project.

Las credenciales sensibles y la configuración por ambiente se leen desde
variables de entorno usando django-environ. En desarrollo, esas variables
se cargan desde backend/.env (ver .env.example).
"""
import sys
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

# --- Carga de variables de entorno -----------------------------------------
env = environ.Env(
    DEBUG=(bool, False),
)

# Lee backend/.env si existe (no se versiona). En producción las variables
# vienen del entorno real, no del archivo.
environ.Env.read_env(BASE_DIR / ".env")

# --- Seguridad --------------------------------------------------------------
SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-change-me")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# En Railway, el dominio público del servicio se inyecta como env var. Lo
# agregamos automáticamente a hosts y orígenes confiables para no hardcodearlo.
RAILWAY_PUBLIC_DOMAIN = env("RAILWAY_PUBLIC_DOMAIN", default="")
CSRF_TRUSTED_ORIGINS = []
if RAILWAY_PUBLIC_DOMAIN:
    ALLOWED_HOSTS.append(RAILWAY_PUBLIC_DOMAIN)
    CSRF_TRUSTED_ORIGINS.append(f"https://{RAILWAY_PUBLIC_DOMAIN}")

# Detrás del proxy de Railway (TLS terminado ahí), confiar en el header que marca
# que la request original era HTTPS.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# --- Aplicaciones -----------------------------------------------------------
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Terceros
    "corsheaders",
    # Apps locales
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # whitenoise sirve los estáticos en producción (justo después de Security).
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # corsheaders debe ir lo más arriba posible, antes de CommonMiddleware.
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Base de datos (Postgres vía psycopg v3) --------------------------------
# Funciona igual contra el Postgres local de Docker o contra Supabase: solo
# cambian las variables de entorno. Supabase = "otro Postgres", sin driver
# especial. Para apuntar a Supabase, ver el bloque comentado en .env.example.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="carvuk"),
        "USER": env("POSTGRES_USER", default="carvuk"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="carvuk"),
        "HOST": env("POSTGRES_HOST", default="localhost"),
        "PORT": env("POSTGRES_PORT", default="5432"),
        "OPTIONS": {
            # Supabase exige TLS -> POSTGRES_SSLMODE=require.
            # Docker local no tiene TLS -> el default "prefer" usa TLS si está
            # disponible y, si no, se conecta sin él. Así un mismo settings sirve
            # para ambos entornos sin tocar código.
            "sslmode": env("POSTGRES_SSLMODE", default="prefer"),
        },
        # Reusa la conexión entre requests en vez de reconectar cada vez.
        # Con el Session Pooler de Supabase es seguro; si usás el Transaction
        # Pooler (puerto 6543) poné POSTGRES_CONN_MAX_AGE=0.
        "CONN_MAX_AGE": env.int("POSTGRES_CONN_MAX_AGE", default=60),
    }
}

# Tests: SQLite en memoria. Es rápido, aislado y no crea ni borra bases en
# Supabase (el pooler deja sesiones abiertas que impiden el DROP de la DB de
# test). El dominio no usa nada específico de Postgres, así que es seguro.
if "test" in sys.argv:
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }

# --- Validación de contraseñas ----------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- Internacionalización ---------------------------------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Archivos estáticos -----------------------------------------------------
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# whitenoise comprime y cachea los estáticos recolectados (admin, etc.).
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- CORS -------------------------------------------------------------------
# Permite que el frontend (Vite) consuma la API desde otro origen.
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173"],
)

# --- Clerk (auth stateless por JWT) -----------------------------------------
# CLERK_ISSUER es el "Frontend API URL" del dashboard de Clerk, p.ej.
# https://tu-app-xxxx.clerk.accounts.dev. Es también el claim `iss` del token.
CLERK_ISSUER = env("CLERK_ISSUER", default="")
# De ahí derivamos el endpoint JWKS donde viven las claves públicas de Clerk.
CLERK_JWKS_URL = f"{CLERK_ISSUER}/.well-known/jwks.json"
# Orígenes autorizados a usar el token (claim `azp`). Normalmente el frontend.
CLERK_AUTHORIZED_PARTIES = env.list(
    "CLERK_AUTHORIZED_PARTIES",
    default=["http://localhost:5173"],
)

# --- Bonus 2: emisión asíncrona contra el SII (simulado por Pipedream) -------
# Endpoint externo al que solicitamos la emisión del documento.
SII_EMISION_URL = env(
    "SII_EMISION_URL", default="https://eoej5sf0r8zkoh2.m.pipedream.net"
)
# Base pública con la que se arma el callbackUrl del webhook. En local con ngrok,
# poné acá la URL del túnel; en producción usa el dominio del backend (en Railway
# se deriva solo del dominio público del servicio).
PUBLIC_BASE_URL = env(
    "PUBLIC_BASE_URL",
    default=(
        f"https://{RAILWAY_PUBLIC_DOMAIN}"
        if RAILWAY_PUBLIC_DOMAIN
        else "http://localhost:8000"
    ),
)
# Secreto compartido para autenticar el webhook del SII. Se incluye como
# `?token=` en el callbackUrl y se verifica al recibir el callback. Si queda
# vacío, el webhook no exige token (cómodo en dev, pero conviene setearlo).
SII_WEBHOOK_SECRET = env("SII_WEBHOOK_SECRET", default="")
