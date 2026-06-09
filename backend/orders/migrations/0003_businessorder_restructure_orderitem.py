import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('businesses', '0001_initial'),
        ('orders',     '0002_initial'),
    ]

    operations = [
        # 1. Actualizar los choices y verbose_name del campo status en Order
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(
                choices=[
                    ('pendiente',  'Pendiente'),
                    ('preparando', 'En preparación'),
                    ('listo',      'Listo para recoger'),
                    ('asignado',   'Asignado a delivery'),
                    ('en_camino',  'En camino'),
                    ('entregado',  'Entregado'),
                    ('cancelado',  'Cancelado'),
                ],
                default='pendiente',
                max_length=20,
                verbose_name='Estado general',
            ),
        ),
        # 2. Actualizar verbose_name del campo client en Order
        migrations.AlterField(
            model_name='order',
            name='client',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='orders',
                to='users.user',
                verbose_name='Cliente registrado',
            ),
        ),
        # 3. Crear el modelo BusinessOrder
        migrations.CreateModel(
            name='BusinessOrder',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status',     models.CharField(
                    choices=[
                        ('pendiente',            'Pendiente de preparación'),
                        ('en_preparacion',       'En preparación'),
                        ('entregado_repartidor', 'Entregado al repartidor'),
                        ('cancelado',            'Cancelado'),
                    ],
                    default='pendiente',
                    max_length=30,
                    verbose_name='Estado en el negocio',
                )),
                ('subtotal',   models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('notes',      models.TextField(blank=True, verbose_name='Notas para el negocio')),
                ('handed_at',  models.DateTimeField(blank=True, null=True, verbose_name='Hora de entrega al repartidor')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('business',   models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name='business_orders',
                    to='businesses.business',
                    verbose_name='Negocio',
                )),
                ('order',      models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='business_orders',
                    to='orders.order',
                    verbose_name='Pedido principal',
                )),
            ],
            options={
                'verbose_name':        'Sub-pedido de Negocio',
                'verbose_name_plural': 'Sub-pedidos de Negocio',
                'ordering':            ['-created_at'],
            },
        ),
        # 4. Quitar el FK antiguo de OrderItem hacia Order
        migrations.RemoveField(
            model_name='orderitem',
            name='order',
        ),
        # 5. Añadir el nuevo FK de OrderItem hacia BusinessOrder
        migrations.AddField(
            model_name='orderitem',
            name='business_order',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='items',
                to='orders.businessorder',
                verbose_name='Sub-pedido',
            ),
            preserve_default=False,
        ),
    ]
