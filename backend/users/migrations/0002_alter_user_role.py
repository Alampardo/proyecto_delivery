from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('admin',    'Administrador'),
                    ('delivery', 'Delivery'),
                    ('client',   'Cliente'),
                    ('owner',    'Dueño de Negocio'),
                ],
                default='client',
                max_length=20,
            ),
        ),
    ]
