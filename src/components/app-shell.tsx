"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, Bell, BookText, BriefcaseBusiness, ChevronDown, FolderKanban, Globe2, LayoutGrid, LogOut, Menu, PanelLeftClose, Search, Settings, Sparkles, X } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Button } from "@/components/ui/button";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/auth";
import { SearchModal } from "@/components/search/SearchModal";

export function AppShell({
  children,
  account,
  initialUnreadCount = 0,
}: {
  children: React.ReactNode;
  account: { name: string; email: string } | null;
  initialUnreadCount?: number;
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const isArabic = locale === "ar";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const base = `/${locale}`;
  const projectsHref = `${base}/projects`;
  const notificationsHref = `${base}/notifications`;
  const reportsHref = `${base}/reports`;
  const switchLocaleHref = pathname.replace(/^\/(en|ar)(?=\/|$)/, `/${isArabic ? "en" : "ar"}`);

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    const result = await signOutAction();
    setSigningOut(false);
    if (result.success) { router.replace(`${base}/login`); router.refresh(); }
  };

  const nav = (
    <>
      <div className="workspace-switcher">
        <div className="workspace-mark"><BriefcaseBusiness size={17} /></div>
        <div className="min-w-0 flex-1">
          <div className="workspace-overline">{isArabic ? "مساحة العمل" : "WORKSPACE"}</div>
          <div className="truncate text-sm font-semibold">{isArabic ? "مساحة فريقي" : "My workspace"}</div>
        </div>
        <ChevronDown size={15} className="text-muted-foreground" />
      </div>
      <div className="nav-section-label">{isArabic ? "مساحة العمل" : "WORKSPACE"}</div>
      <nav aria-label={isArabic ? "التنقل الرئيسي" : "Main navigation"} className="space-y-1">
        <Link onClick={() => setMobileOpen(false)} href={projectsHref} className={cn("app-nav-link", pathname === projectsHref || pathname === base ? "app-nav-link-active" : "")}>
          <LayoutGrid size={17} /> <span>{isArabic ? "نظرة عامة" : "Overview"}</span>
        </Link>
        <Link onClick={() => setMobileOpen(false)} href={projectsHref} className={cn("app-nav-link", pathname.startsWith(`${projectsHref}/`) ? "app-nav-link-active" : "")}>
          <FolderKanban size={17} /> <span>{isArabic ? "المشاريع" : "Projects"}</span>
        </Link>
        <Link onClick={() => setMobileOpen(false)} href={notificationsHref} className={cn("app-nav-link", pathname === notificationsHref ? "app-nav-link-active" : "")}>
          <Bell size={17} /> <span>{isArabic ? "الإشعارات" : "Notifications"}</span>
        </Link>
        <Link onClick={() => setMobileOpen(false)} href={reportsHref} className={cn("app-nav-link", pathname.startsWith(reportsHref) ? "app-nav-link-active" : "")}>
          <BarChart3 size={17} /> <span>{isArabic ? "التقارير" : "Reports"}</span>
        </Link>
      </nav>
      <div className="nav-section-label nav-section-spaced">{isArabic ? "مساحة خاصة" : "PERSONAL"}</div>
      <nav aria-label={isArabic ? "التنقل الخاص" : "Personal navigation"} className="space-y-1">
        <Link onClick={() => setMobileOpen(false)} href={`${base}/notes`} className={cn("app-nav-link", pathname === `${base}/notes` ? "app-nav-link-active" : "")}>
          <BookText size={17} /> <span>{isArabic ? "ملاحظاتي" : "My notes"}</span>
        </Link>
        <Link onClick={() => setMobileOpen(false)} href={`${base}/settings`} className={cn("app-nav-link", pathname === `${base}/settings` ? "app-nav-link-active" : "")}>
          <Settings size={17} /> <span>{isArabic ? "الإعدادات" : "Settings"}</span>
        </Link>
      </nav>
      <div className="sidebar-note mt-3">
        <div className="sidebar-note-icon"><Sparkles size={16} /></div>
        <p>{isArabic ? "كل عملك في مكان واحد" : "All your work, in one place"}</p>
        <span>{isArabic ? "نظم المشاريع وتابع تقدم فريقك." : "Organize projects and keep your team moving."}</span>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-profile">
          <div className="profile-avatar">{account?.name?.[0]?.toUpperCase() || (isArabic ? "م" : "W")}</div>
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{account?.name || (isArabic ? "مساحة العمل" : "Workspace")}</div><div className="truncate text-xs text-muted-foreground">{account?.email || (isArabic ? "إدارة المشاريع" : "Project management")}</div></div>
          {account ? <button type="button" onClick={handleSignOut} disabled={signingOut} title={isArabic ? "تسجيل الخروج" : "Sign out"} aria-label={isArabic ? "تسجيل الخروج" : "Sign out"} className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"><LogOut size={16} /></button> : <PanelLeftClose size={16} className="text-muted-foreground" />}
        </div>
      </div>
    </>
  );

  return (
    <div className="app-shell" dir={isArabic ? "rtl" : "ltr"}>
      {mobileOpen && <button aria-label={isArabic ? "إغلاق القائمة" : "Close navigation"} className="mobile-scrim" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("app-sidebar", mobileOpen && "app-sidebar-open")}>
        <div className="brand-row">
          <Link href={projectsHref} className="brand-lockup" onClick={() => setMobileOpen(false)}>
            <span className="brand-icon"><BriefcaseBusiness size={19} strokeWidth={2.2} /></span>
            <span className="brand-name">work<span>space</span></span>
          </Link>
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label={isArabic ? "إغلاق" : "Close"}><X size={19} /></button>
        </div>
        {nav}
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <div className="topbar-start">
            <Button variant="ghost" size="icon" className="mobile-menu-button" aria-label={isArabic ? "فتح القائمة" : "Open navigation"} onClick={() => setMobileOpen(true)}><Menu size={20} /></Button>
            <div className="breadcrumb"><span>{isArabic ? "مساحة العمل" : "Workspace"}</span><span className="breadcrumb-divider">/</span><strong>{pathname.includes("notifications") ? (isArabic ? "الإشعارات" : "Notifications") : pathname.endsWith("/notes") ? (isArabic ? "الملاحظات" : "Notes") : pathname.includes("/projects/") ? (isArabic ? "تفاصيل المشروع" : "Project workspace") : (isArabic ? "المشاريع" : "Projects")}</strong></div>
          </div>
          <div className="topbar-actions">
            <a className="locale-button" href={switchLocaleHref} aria-label={isArabic ? "Switch to English" : "التبديل إلى العربية"}><Globe2 size={16} /><span>{isArabic ? "EN" : "عربي"}</span></a>
            <ThemeSwitcher />
            <NotificationBell initialUnreadCount={initialUnreadCount} />
            <div className="topbar-avatar" aria-label={account?.name || (isArabic ? "الحساب" : "Account")}>{account?.name?.[0]?.toUpperCase() || (isArabic ? "م" : "W")}</div>
          </div>
        </header>
        <main className="app-content">{children}</main>
      </div>
      <Toaster position={isArabic ? "top-left" : "top-right"} />
      <SearchModal />
    </div>
  );
}
