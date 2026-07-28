export const LOCALE_COOKIE = "seeder-locale";

export const SUPPORTED_LOCALES = ["vi", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "vi";

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function getLocaleFromValue(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

type TranslationKey =
  | "activity"
  | "activeDays30d"
  | "activeDays30dDetail"
  | "admin"
  | "allClear"
  | "allClearDetail"
  | "allTeams"
  | "archived"
  | "archivedWorkspaces"
  | "archivedWorkspacesDescription"
  | "branches"
  | "buildReviewShip"
  | "cancel"
  | "clearAll"
  | "client"
  | "close"
  | "closeMenu"
  | "closeNotifications"
  | "closeSearch"
  | "continueWithGoogle"
  | "createAccountAndSignIn"
  | "createOneToBegin"
  | "createOwnerAccount"
  | "dashboard"
  | "dailyOps"
  | "deadline"
  | "displayName"
  | "done"
  | "email"
  | "featured"
  | "finished"
  | "inbox"
  | "invite"
  | "manageTeam"
  | "needAttention"
  | "noArchivedProjects"
  | "noDeadlineSet"
  | "noMatches"
  | "noProjectsYet"
  | "notifications"
  | "notificationsUnavailable"
  | "open"
  | "openMenu"
  | "overdue"
  | "password"
  | "people"
  | "performance"
  | "personal"
  | "personalWorkspace"
  | "project"
  | "projectIndex"
  | "projectList"
  | "projectWorkspace"
  | "projects"
  | "request"
  | "score"
  | "search"
  | "settings"
  | "shipped7d"
  | "shipped7dDetail"
  | "shipped30d"
  | "shipped30dDetail"
  | "shippedAllTime"
  | "shippedAllTimeDetail"
  | "shortcuts"
  | "signOut"
  | "system"
  | "task"
  | "teams"
  | "today"
  | "users"
  | "workspace";

const translations: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    activity: "Activity",
    activeDays30d: "Active days (30d)",
    activeDays30dDetail: "Days with at least one activity.",
    admin: "Admin",
    allClear: "All clear",
    allClearDetail: "All open projects are calm - no pressure to surface.",
    allTeams: "All teams",
    archived: "Archived",
    archivedWorkspaces: "Archived workspaces",
    archivedWorkspacesDescription:
      "Keep archived work out of the main list, but close enough to restore when needed.",
    branches: "branches",
    buildReviewShip: "Build, review, ship.",
    cancel: "Cancel",
    clearAll: "Clear all",
    client: "Client",
    close: "Close",
    closeMenu: "Close menu",
    closeNotifications: "Close notifications",
    closeSearch: "Close search",
    continueWithGoogle: "Continue with Google",
    createAccountAndSignIn: "Create account & sign in",
    createOneToBegin: "Create one to begin.",
    createOwnerAccount: "Create owner account",
    dashboard: "Dashboard",
    dailyOps: "Daily Ops",
    deadline: "Deadline",
    displayName: "Display name",
    done: "Done",
    email: "Email",
    featured: "Featured",
    finished: "Finished",
    inbox: "Inbox",
    invite: "Invite",
    manageTeam: "Manage the team.",
    needAttention: "need attention",
    noArchivedProjects: "No archived projects",
    noDeadlineSet: "No deadline set",
    noMatches: "No matches",
    noProjectsYet: "No projects yet",
    notifications: "Notifications",
    notificationsUnavailable: "Notifications are temporarily unavailable.",
    open: "Open",
    openMenu: "Open menu",
    overdue: "Overdue",
    password: "Password",
    people: "People",
    performance: "Performance",
    personal: "Personal",
    personalWorkspace: "Personal workspace",
    project: "Project",
    projectIndex: "Project index",
    projectList: "Project list",
    projectWorkspace: "Project workspace",
    projects: "Projects",
    request: "Request",
    score: "Score",
    search: "Search",
    settings: "Settings",
    shipped7d: "Shipped 7d",
    shipped7dDetail: "Updates published this week.",
    shipped30d: "Shipped 30d",
    shipped30dDetail: "Updates in the last 30 days.",
    shippedAllTime: "All-time shipped",
    shippedAllTimeDetail: "Lifetime client updates.",
    shortcuts: "Shortcuts",
    signOut: "Sign Out",
    system: "System",
    task: "Task",
    teams: "Teams",
    today: "Today",
    users: "Users",
    workspace: "Workspace",
  },
  vi: {
    activity: "Hoạt động",
    activeDays30d: "Ngày hoạt động (30 ngày)",
    activeDays30dDetail: "Số ngày có ít nhất một hoạt động.",
    admin: "Quản trị",
    allClear: "Ổn cả",
    allClearDetail: "Các dự án đang mở đều ổn - chưa có áp lực cần chú ý.",
    allTeams: "Tất cả đội",
    archived: "Đã lưu trữ",
    archivedWorkspaces: "Không gian đã lưu trữ",
    archivedWorkspacesDescription:
      "Giữ công việc đã lưu trữ khỏi danh sách chính, nhưng vẫn đủ gần để khôi phục khi cần.",
    branches: "nhánh",
    buildReviewShip: "Xây dựng, rà soát, bàn giao.",
    cancel: "Hủy",
    clearAll: "Xóa tất cả",
    client: "Khách hàng",
    close: "Đóng",
    closeMenu: "Đóng menu",
    closeNotifications: "Đóng thông báo",
    closeSearch: "Đóng tìm kiếm",
    continueWithGoogle: "Tiếp tục với Google",
    createAccountAndSignIn: "Tạo tài khoản và đăng nhập",
    createOneToBegin: "Tạo dự án đầu tiên để bắt đầu.",
    createOwnerAccount: "Tạo tài khoản chủ sở hữu",
    dashboard: "Bảng điều khiển",
    dailyOps: "Vận hành ngày",
    deadline: "Hạn chót",
    displayName: "Tên hiển thị",
    done: "Hoàn tất",
    email: "Email",
    featured: "Nổi bật",
    finished: "Đã xong",
    inbox: "Hộp vào",
    invite: "Mời",
    manageTeam: "Quản lý đội ngũ.",
    needAttention: "cần chú ý",
    noArchivedProjects: "Chưa có dự án lưu trữ",
    noDeadlineSet: "Chưa đặt hạn chót",
    noMatches: "Không có kết quả",
    noProjectsYet: "Chưa có dự án",
    notifications: "Thông báo",
    notificationsUnavailable: "Tạm thời chưa tải được thông báo.",
    open: "Đang mở",
    openMenu: "Mở menu",
    overdue: "Quá hạn",
    password: "Mật khẩu",
    people: "Con người",
    performance: "Hiệu suất",
    personal: "Cá nhân",
    personalWorkspace: "Không gian cá nhân",
    project: "Dự án",
    projectIndex: "Danh mục dự án",
    projectList: "Danh sách dự án",
    projectWorkspace: "Không gian dự án",
    projects: "Dự án",
    request: "Yêu cầu",
    score: "Điểm",
    search: "Tìm kiếm",
    settings: "Cài đặt",
    shipped7d: "Đã bàn giao 7 ngày",
    shipped7dDetail: "Cập nhật đã đăng trong tuần này.",
    shipped30d: "Đã bàn giao 30 ngày",
    shipped30dDetail: "Cập nhật trong 30 ngày gần đây.",
    shippedAllTime: "Tổng đã bàn giao",
    shippedAllTimeDetail: "Tổng số cập nhật cho khách hàng.",
    shortcuts: "Phím tắt",
    signOut: "Đăng xuất",
    system: "Hệ thống",
    task: "Công việc",
    teams: "Đội nhóm",
    today: "Hôm nay",
    users: "Người dùng",
    workspace: "Không gian",
  },
};

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}
