from django.contrib import admin
from .models import Business, BusinessOwnerProfile, BusinessSchedule, BusinessToken, Product


class ScheduleInline(admin.TabularInline):
    model = BusinessSchedule
    extra = 0


class ProductInline(admin.TabularInline):
    model  = Product
    extra  = 0
    fields = ('name', 'price', 'stock', 'is_available', 'is_featured')


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display  = ('name', 'category', 'phone', 'is_active', 'created_at')
    list_filter   = ('category', 'is_active')
    search_fields = ('name', 'address')
    inlines       = [ScheduleInline, ProductInline]


@admin.register(BusinessToken)
class BusinessTokenAdmin(admin.ModelAdmin):
    list_display    = ('business', 'short_code', 'is_used', 'used_by', 'created_at')
    list_filter     = ('is_used',)
    readonly_fields = ('code', 'created_at', 'used_at', 'used_by')
    search_fields   = ('business__name',)

    def short_code(self, obj):
        return str(obj.code).upper()
    short_code.short_description = 'Token'


@admin.register(BusinessOwnerProfile)
class BusinessOwnerProfileAdmin(admin.ModelAdmin):
    list_display  = ('user', 'business', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'business__name')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display  = ('name', 'business', 'price', 'stock', 'is_available', 'is_featured')
    list_filter   = ('business__category', 'is_available', 'is_featured')
    search_fields = ('name', 'business__name')
    list_editable = ('is_available', 'is_featured', 'stock')
