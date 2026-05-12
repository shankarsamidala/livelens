import { MODE_COLORS } from '../styles/tokens';

export interface AnalysisMode {
    id: string;
    /** Emoji icon — used in both overlay chips and launcher cards. */
    icon: string;
    label: string;
    description: string;
    /** Card background colour (Launcher UI). */
    color: string;
    /** Card border colour (Launcher UI). */
    border: string;
}

export const ANALYSIS_MODES: readonly AnalysisMode[] = [
    { id: 'general',       icon: '💬', label: 'General',       description: 'Describe and solve whatever is visible on screen.',          ...MODE_COLORS.general },
    { id: 'dsa',           icon: '🧩', label: 'DSA',           description: 'Naive → optimal approach, code, and complexity analysis.',    ...MODE_COLORS.dsa },
    { id: 'system-design', icon: '🏗️', label: 'System Design', description: 'Architecture, capacity planning, and trade-off discussion.',  ...MODE_COLORS.systemDesign },
    { id: 'debug',         icon: '🐛', label: 'Debug',         description: 'Find the bug, explain the root cause, and provide a fix.',    ...MODE_COLORS.debug },
    { id: 'behavioral',    icon: '🎯', label: 'Behavioral',    description: 'STAR-method first-person answer for interview questions.',     ...MODE_COLORS.behavioral },
    { id: 'sales',         icon: '💼', label: 'Sales',         description: 'Objection handling, discovery questions, and deal closing.',   ...MODE_COLORS.sales },
    { id: 'data-science',  icon: '📊', label: 'Data Science',  description: 'Analysis approach, ML methodology, Python-first answers.',    ...MODE_COLORS.dataScience },
    { id: 'devops',        icon: '⚙️', label: 'DevOps',        description: 'Infrastructure, CI/CD pipelines, and container strategy.',    ...MODE_COLORS.devops },
] as const;
