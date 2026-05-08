// Skill data configuration file
// Used to manage data for the skill display page

export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string; // Iconify icon name
	category: "frontend" | "backend" | "database" | "tools" | "other";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience: {
		years: number;
		months: number;
	};
	projects?: string[]; // Related project IDs
	certifications?: string[];
	color?: string; // Skill card theme color
}

export const skillsData: Skill[] = [
	// 专业技能
	{
		id: "vibe-coding",
		name: "Vibe Coding",
		description: "AI 辅助编程，利用大语言模型进行代码生成、重构和调试，大幅提升开发效率。",
		icon: "mdi:robot-happy",
		category: "other",
		level: "advanced",
		experience: { years: 0, months: 0 },
		color: "#10B981",
	},
	{
		id: "ai-agent",
		name: "智能体开发",
		description: "基于大语言模型的 AI Agent 开发，包括工具调用、记忆管理和多步推理。",
		icon: "mdi:brain",
		category: "other",
		level: "advanced",
		experience: { years: 0, months: 0 },
		color: "#8B5CF6",
	},
	{
		id: "java",
		name: "Java",
		description: "面向对象的编程语言，广泛用于企业级应用和 Android 开发。",
		icon: "logos:java",
		category: "other",
		level: "intermediate",
		experience: { years: 0, months: 0 },
		projects: ["arch-acg"],
		color: "#ED8B00",
	},
	{
		id: "springboot",
		name: "Spring Boot",
		description: "Java 生态最流行的全栈开发框架，简化企业级应用开发。",
		icon: "logos:spring-icon",
		category: "other",
		level: "intermediate",
		experience: { years: 0, months: 1 },
		projects: ["arch-acg"],
		color: "#6DB33F",
	},
	{
		id: "python",
		name: "Python",
		description: "通用编程语言，广泛用于机器学习、数据科学和后端开发。",
		icon: "logos:python",
		category: "other",
		level: "advanced",
		experience: { years: 0, months: 6 },
		projects: ["micro-expression-recognizer"],
		color: "#3776AB",
	},
	{
		id: "typescript",
		name: "TypeScript",
		description: "JavaScript 的类型超集，提升代码质量和开发效率。",
		icon: "logos:typescript-icon",
		category: "other",
		level: "advanced",
		experience: { years: 0, months: 6 },
		projects: ["arch-acg", "mindhub"],
		color: "#3178C6",
	},
	{
		id: "react",
		name: "React",
		description: "用于构建用户界面的 JavaScript 库，包括 Hooks、Context 和状态管理。",
		icon: "logos:react",
		category: "other",
		level: "advanced",
		experience: { years: 0, months: 3 },
		projects: ["arch-acg"],
		color: "#61DAFB",
	},
	{
		id: "pytorch",
		name: "PyTorch",
		description: "开源深度学习框架，灵活且高效的张量计算和自动求导。",
		icon: "logos:pytorch",
		category: "other",
		level: "intermediate",
		experience: { years: 0, months: 1 },
		projects: ["micro-expression-recognizer"],
		color: "#EE4C2C",
	},
	{
		id: "nextjs",
		name: "Next.js",
		description: "基于 React 的全栈框架，支持 App Router、SSR/SSG 和静态导出。",
		icon: "logos:nextjs-icon",
		category: "other",
		level: "advanced",
		experience: { years: 0, months: 3 },
		projects: ["mindhub"],
		color: "#616161",
	},
	{
		id: "rag",
		name: "RAG",
		description: "检索增强生成技术，结合向量数据库与大语言模型实现精准问答。",
		icon: "mdi:database-search",
		category: "other",
		level: "intermediate",
		experience: { years: 0, months: 0 },
		color: "#616161",
	},
];

// Get skill statistics
export const getSkillStats = () => {
	const total = skillsData.length;
	const byLevel = {
		beginner: skillsData.filter((s) => s.level === "beginner").length,
		intermediate: skillsData.filter((s) => s.level === "intermediate")
			.length,
		advanced: skillsData.filter((s) => s.level === "advanced").length,
		expert: skillsData.filter((s) => s.level === "expert").length,
	};
	const byCategory = {
		frontend: skillsData.filter((s) => s.category === "frontend").length,
		backend: skillsData.filter((s) => s.category === "backend").length,
		database: skillsData.filter((s) => s.category === "database").length,
		tools: skillsData.filter((s) => s.category === "tools").length,
		other: skillsData.filter((s) => s.category === "other").length,
	};

	return { total, byLevel, byCategory };
};

// Get skills by category
export const getSkillsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return skillsData;
	}
	return skillsData.filter((s) => s.category === category);
};

// Get advanced skills
export const getAdvancedSkills = () => {
	return skillsData.filter(
		(s) => s.level === "advanced" || s.level === "expert",
	);
};

// Calculate total years of experience
export const getTotalExperience = () => {
	const totalMonths = skillsData.reduce((total, skill) => {
		return total + skill.experience.years * 12 + skill.experience.months;
	}, 0);
	return {
		years: Math.floor(totalMonths / 12),
		months: totalMonths % 12,
	};
};
