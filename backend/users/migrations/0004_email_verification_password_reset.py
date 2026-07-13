import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def mark_existing_users_verified(apps, schema_editor):
    """Usuarios creados antes de este feature se marcan como verificados."""
    User = apps.get_model('users', 'User')
    User.objects.all().update(is_email_verified=True)


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_pushsubscription'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_email_verified',
            field=models.BooleanField(default=False, verbose_name='Email verificado'),
        ),
        migrations.RunPython(mark_existing_users_verified, reverse_code=migrations.RunPython.noop),
        migrations.CreateModel(
            name='EmailVerificationToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('expires_at', models.DateTimeField()),
                ('is_used', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='email_verification',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Token de verificación de email',
                'verbose_name_plural': 'Tokens de verificación de email',
            },
        ),
        migrations.CreateModel(
            name='PasswordResetToken',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('token', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('expires_at', models.DateTimeField()),
                ('is_used', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='password_reset_tokens',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Token de restablecimiento de contraseña',
                'verbose_name_plural': 'Tokens de restablecimiento de contraseña',
                'ordering': ['-created_at'],
            },
        ),
    ]
