from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_admin)


class IsBusinessOwner(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_owner
            and hasattr(request.user, 'owner_profile')
        )


class IsOwnerOfBusiness(BasePermission):
    """Verifica que el objeto pertenece al negocio del dueño autenticado."""
    def has_object_permission(self, request, view, obj):
        if not (request.user.is_authenticated and request.user.is_owner):
            return False
        try:
            owner_business = request.user.owner_profile.business
        except Exception:
            return False
        # obj puede ser Product o BusinessOrder; ambos tienen FK a business
        return getattr(obj, 'business_id', None) == owner_business.pk
