import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('businesses', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='BusinessToken',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code',       models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('is_used',    models.BooleanField(default=False, verbose_name='Usado')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('used_at',    models.DateTimeField(blank=True, null=True)),
                ('business',   models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='registration_token',
                    to='businesses.business',
                    verbose_name='Negocio asociado',
                )),
                ('used_by',    models.OneToOneField(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='business_token',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Usado por',
                )),
            ],
            options={
                'verbose_name':        'Token de Comercio',
                'verbose_name_plural': 'Tokens de Comercio',
                'ordering':            ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='BusinessOwnerProfile',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('business',   models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='owners',
                    to='businesses.business',
                    verbose_name='Negocio',
                )),
                ('user',       models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='owner_profile',
                    to=settings.AUTH_USER_MODEL,
                    verbose_name='Usuario',
                )),
            ],
            options={
                'verbose_name':        'Perfil Dueño de Negocio',
                'verbose_name_plural': 'Perfiles Dueños de Negocio',
            },
        ),
    ]
