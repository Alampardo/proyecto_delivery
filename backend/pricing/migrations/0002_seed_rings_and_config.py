from django.db import migrations

RING_PRICES = {1: 8, 2: 11, 3: 15, 4: 18}


def seed(apps, schema_editor):
    ShippingRing = apps.get_model('pricing', 'ShippingRing')
    PricingConfig = apps.get_model('pricing', 'PricingConfig')

    for number, price in RING_PRICES.items():
        ShippingRing.objects.get_or_create(number=number, defaults={'price': price})

    PricingConfig.objects.get_or_create(pk=1)


def unseed(apps, schema_editor):
    ShippingRing = apps.get_model('pricing', 'ShippingRing')
    PricingConfig = apps.get_model('pricing', 'PricingConfig')
    ShippingRing.objects.filter(number__in=RING_PRICES.keys()).delete()
    PricingConfig.objects.filter(pk=1).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('pricing', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed, unseed),
    ]
