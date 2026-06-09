from django.contrib import admin
from .models import BusinessOrder, Order, OrderItem


class BusinessOrderInline(admin.TabularInline):
    model           = BusinessOrder
    extra           = 0
    readonly_fields = ('subtotal', 'handed_at')
    fields          = ('business', 'status', 'subtotal', 'notes', 'handed_at')


class OrderItemInline(admin.TabularInline):
    model           = OrderItem
    extra           = 0
    readonly_fields = ('subtotal',)
    fields          = ('product', 'quantity', 'unit_price', 'subtotal')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display    = ('id', 'client_name', 'client_phone', 'delivery', 'status', 'total', 'created_at')
    list_filter     = ('status', 'created_at')
    search_fields   = ('client_name', 'client_phone', 'delivery__first_name')
    readonly_fields = ('created_at', 'updated_at', 'total')
    inlines         = [BusinessOrderInline]
    date_hierarchy  = 'created_at'


@admin.register(BusinessOrder)
class BusinessOrderAdmin(admin.ModelAdmin):
    list_display    = ('id', 'business', 'order', 'status', 'subtotal', 'handed_at', 'created_at')
    list_filter     = ('status', 'business', 'created_at')
    search_fields   = ('business__name', 'order__client_name')
    readonly_fields = ('created_at', 'updated_at', 'handed_at')
    inlines         = [OrderItemInline]
