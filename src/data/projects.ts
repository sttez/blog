// Project data configuration file
// Used to manage data for the project display page

export interface Project {
	id: string;
	title: string;
	description: string;
	image: string;
	category: "web" | "mobile" | "desktop" | "other";
	techStack: string[];
	status: "completed" | "in-progress" | "planned";
	liveDemo?: string;
	sourceCode?: string;
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
	visitUrl?: string; // 添加前往项目链接字段
}

export const projectsData: Project[] = [
	{
		id: "momentify",
		title: "Momentify",
		description:
			"一款 Flutter 朋友圈美化应用，支持模板拼图、滤镜贴纸、文字编辑与九宫格导出",
		image: "",
		category: "mobile",
		techStack: ["Flutter", "Dart", "Riverpod", "GoRouter", "Hive"],
		status: "in-progress",
		sourceCode: "https://github.com/sttez/Momentify",
		startDate: "2026-05-03",
		tags: ["Mobile", "Flutter", "朋友圈", "图片编辑", "模板"],
	},
	{
		id: "ciyuanju",
		title: "次元聚",
		description:
			"二次元社区微信小程序，支持动态发布、约单交易、实时聊天、教程分享和用户资料管理",
		image: "",
		category: "mobile",
		techStack: [
			"微信小程序",
			"WXML",
			"WXSS",
			"Node.js",
			"Express",
			"MySQL",
			"Socket.IO",
		],
		status: "completed",
		startDate: "2026-04-01",
		endDate: "2026-04-28",
		tags: ["微信小程序", "二次元", "社区", "实时聊天", "全栈"],
	},
	{
		id: "arch-acg",
		title: "ARCH ACG",
		description:
			"面向 COSER、摄影师、妆娘等 ACG 创作者的综合社区平台，支持约单服务、动态分享与即时通讯。",
		image: "",
		category: "web",
		techStack: [
			"React 19",
			"TypeScript",
			"Vite",
			"Tailwind CSS",
			"Zustand",
			"React Query",
			"Spring Boot 3.2",
			"MySQL",
			"Redis",
			"WebSocket",
			"Docker",
		],
		status: "in-progress",
		sourceCode: "https://github.com/ZHH905/arch-acg",
		startDate: "2025-12-01",
		tags: ["ACG社区", "二次元", "约单平台", "全栈"],
	},
	{
		id: "micro-expression-recognizer",
		title: "微表情识别系统",
		description:
			"基于三流CNN+双向LSTM深度学习模型的微表情识别系统，支持图像、视频和实时摄像头预测，五类微表情分类",
		image: "",
		category: "desktop",
		techStack: [
			"Python",
			"PyTorch",
			"OpenCV",
			"dlib",
			"PyQt5",
			"Gradio",
			"NumPy",
			"scikit-learn",
		],
		status: "completed",
		sourceCode: "https://github.com/sttez/Micro-expressionsRrecognition",
		startDate: "2025-05-10",
		endDate: "2026-05-08",
		tags: ["深度学习", "计算机视觉", "微表情识别", "PyTorch", "CASME2"],
	},
	{
		id: "mindhub",
		title: "MindHub",
		description:
			"AI 驱动的知识工作台 Web 应用，帮助用户管理、分析和关联知识资源。核心功能包括资源管理、任务流编辑、知识图谱可视化和 AI 智能洞察。",
		image: "",
		category: "web",
		techStack: [
			"Next.js",
			"TypeScript",
			"Tailwind CSS",
			"shadcn/ui",
			"@xyflow/react",
			"Cytoscape.js",
			"Supabase",
			"DeepSeek API",
		],
		status: "completed",
		sourceCode: "https://github.com/sttez/mindhub",
		visitUrl: "https://mindhub.vercel.app/",
		startDate: "2024-01-01",
		tags: ["AI", "Knowledge Management", "Full Stack"],
	},
];

// Get project statistics
export const getProjectStats = () => {
	const total = projectsData.length;
	const completed = projectsData.filter(
		(p) => p.status === "completed",
	).length;
	const inProgress = projectsData.filter(
		(p) => p.status === "in-progress",
	).length;
	const planned = projectsData.filter((p) => p.status === "planned").length;

	return {
		total,
		byStatus: {
			completed,
			inProgress,
			planned,
		},
	};
};

// Get projects by category
export const getProjectsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return projectsData;
	}
	return projectsData.filter((p) => p.category === category);
};

// Get featured projects
export const getFeaturedProjects = () => {
	return projectsData.filter((p) => p.featured);
};

// Get all tech stacks
export const getAllTechStack = () => {
	const techSet = new Set<string>();
	projectsData.forEach((project) => {
		project.techStack.forEach((tech) => {
			techSet.add(tech);
		});
	});
	return Array.from(techSet).sort();
};

