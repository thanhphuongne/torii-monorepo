"use client"


import { NavMain } from "@/components/layout/nav-main"
import { NavUser } from "@/components/layout/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarRail,
} from "@workspace/ui/components/sidebar"
import { useAppSelector } from "@/hooks/hooks"
import { usePermissions } from "@/hooks/use-permissions"
import { useLogo } from "@/hooks/useLogo"
import { selectUser } from "@/store/slices/auth-slice"
import { academicNavItems, operationsNavItems, financeNavItems, personnelNavItems, systemNavItems, type NavItem } from "@/config/navigation"

const NAV_GROUPS: { labelKey: string; items: NavItem[] }[] = [
    { labelKey: "Đào tạo", items: academicNavItems },
    { labelKey: "Vận hành", items: operationsNavItems },
    { labelKey: "Kinh doanh", items: financeNavItems },
    { labelKey: "Người dùng", items: personnelNavItems },
    { labelKey: "Hệ thống", items: systemNavItems },
];

function navParentVisible(item: NavItem, can: (p: string) => boolean, canAny: (p: string[]) => boolean): boolean {
    if (item.permission) return can(item.permission);
    if (item.anyPermission?.length) return canAny(item.anyPermission);
    return true;
}

function navSubVisible(
    sub: NonNullable<NavItem["items"]>[number],
    parentOk: boolean,
    can: (p: string) => boolean,
    canAny: (p: string[]) => boolean,
    isTeachingOnly: boolean,
): boolean {
    if (!parentOk) return false;
    if (sub.url === "/academy/vod-packages/my" && !isTeachingOnly) return false;
    // Giảng viên không quản lý Course Profile trong admin sidebar.
    if (sub.url === "/academy/course-profiles" && isTeachingOnly) return false;
    if (sub.permission) return can(sub.permission);
    if (sub.anyPermission?.length) return canAny(sub.anyPermission);
    return true;
}

/** Ẩn mục cha nếu không đủ quyền hoặc (có con nhưng) không còn mục con nào hiển thị được. */
function navItemShows(
    item: NavItem,
    can: (p: string) => boolean,
    canAny: (p: string[]) => boolean,
    isTeachingOnly: boolean,
): boolean {
    if (!item.items?.length) return navParentVisible(item, can, canAny);
    const pv = navParentVisible(item, can, canAny);
    if (!pv) return false;
    return item.items.some((sub) => navSubVisible(sub, pv, can, canAny, isTeachingOnly));
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const user = useAppSelector(selectUser);
    const logo = useLogo();
    const { can, canAny } = usePermissions();
    // Trang "Khóa học VOD tôi phụ trách" chỉ dành cho giảng viên (role=lecturer).
    // Admin/staff lms không phải người giảng dạy nên không được thấy option này.
    const isTeachingOnly = user?.role === "lecturer";
    const isOpsStaff = user?.role === "staff-operations";

    const visibleNavGroups = NAV_GROUPS.map((g) => ({
        ...g,
        items: g.items
            .filter((item) => {
                // Nhân viên vận hành không được thấy các mục học thuật / đào tạo tinh gọn
                if (isOpsStaff && item.url.startsWith("/academy") && item.url !== "/") return false;
                return navItemShows(item, can, canAny, isTeachingOnly);
            })
            .map((item) => {
                if (!item.items) return item;
                const pv = navParentVisible(item, can, canAny);
                return {
                    ...item,
                    items: item.items.filter((sub) => navSubVisible(sub, pv, can, canAny, isTeachingOnly)),
                };
            }),
    })).filter((g) => g.items.length > 0);

    const mappedUser = {
        displayName: user?.displayName || "",
        email: user?.email || "",
        avatarUrl: user?.avatarUrl || undefined,
        role: user?.role,
    }

    return (
        <Sidebar
            collapsible="icon"
            variant="sidebar"
            {...props}
            className="border-r border-border bg-card"
        >
            <SidebarHeader className="h-auto py-4 px-4 flex flex-col gap-3 group-data-[collapsible=icon]:px-0">
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                    <div className="flex items-center justify-center shrink-0 group-data-[collapsible=icon]:mx-auto">
                        <img src={logo} alt="Torii" className="h-10 w-auto object-contain" />
                    </div>
                    <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                        <div className="text-sm font-semibold truncate">Torii Admin</div>
                        <div className="text-[11px] text-muted-foreground/60 truncate">
                            Hệ thống quản trị
                        </div>
                    </div>
                </div>
            </SidebarHeader>


            <SidebarContent className="scrollbar-none">
                {visibleNavGroups.map((group) => (
                    <NavMain
                        key={group.labelKey}
                        label={group.labelKey}
                        items={(group.items as NavItem[]).map(item => ({
                            ...item,
                            title: item.titleKey,
                            items: item.items?.map(sub => ({
                                ...sub,
                                title: sub.titleKey
                            }))
                        })) as any}
                    />
                ))}
            </SidebarContent>

            <SidebarFooter className="pb-8 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pb-4 group-data-[collapsible=icon]:items-center">
                <NavUser user={mappedUser} />
            </SidebarFooter>
            <SidebarRail className="hover:after:bg-primary/20" />
        </Sidebar>
    )
}
