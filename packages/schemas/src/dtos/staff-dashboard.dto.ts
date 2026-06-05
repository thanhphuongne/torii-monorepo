// Staff Dashboard Response DTO
export interface StaffDashboardResponseDTO {
    totalCourses: number;
    activeCourses: number;
    totalStudents: number;
    totalLecturers: number;
    recentEnrollments?: number;
}

// Extended dashboard with additional metrics (future)
export interface StaffDashboardExtendedResponseDTO extends StaffDashboardResponseDTO {
    draftCourses: number;
    publishedCourses: number;
    archivedCourses: number;
    totalModules: number;
    totalLessons: number;
    totalMaterials: number;
}
