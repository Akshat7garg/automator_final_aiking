"use client";
import React, { useEffect, useState } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BookOpen, ExternalLink } from "lucide-react";

interface Blog {
    title: string;
    url: string;
    cover_image: string;
}

interface SkillBlogCache {
    [skill: string]: {
        blogs: Blog[];
        timestamp: number;
    };
}

const SKILL_TO_DEVTO_TAG: Record<string, string> = {
    JavaScript: "javascript",
    TypeScript: "typescript",
    React: "react",
    "Next.js": "nextjs",
    "Node.js": "node",
    Angular: "angular",
    Vue: "vue",
    Svelte: "svelte",
    "Tailwind CSS": "tailwindcss",
    CSS: "css",
    HTML: "html",
    SQL: "sql",
    MySQL: "mysql",
    PostgreSQL: "postgresql",
    MongoDB: "mongodb",
    Firebase: "firebase",
    Docker: "docker",
    Kubernetes: "kubernetes",
    AWS: "aws",
    Python: "python",
    Django: "django",
    Java: "java",
    PHP: "php",
    Laravel: "laravel",
    "C#": "csharp",
    "C++": "cpp",
    ".NET": "dotnet",
};

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

const fetchBlogsFromAPI = async (skill: string): Promise<Blog[]> => {
    try {
        const normalizedSkill = skill.toLowerCase();
        const mappedTag =
            SKILL_TO_DEVTO_TAG[skill] ??
            normalizedSkill.replace(/[^a-z0-9]/gi, "");

        const res = await fetch(
            `https://dev.to/api/articles?tag=${mappedTag}&per_page=15`
        );

        if (!res.ok) return [];

        const data = await res.json();

        return data
            .filter((article: any) => {
                const title = (article.title ?? "").toLowerCase();
                const desc = (article.description ?? "").toLowerCase();
                const tags: string[] = article.tag_list ?? [];

                return (
                    title.includes(normalizedSkill) ||
                    desc.includes(normalizedSkill) ||
                    tags.includes(mappedTag)
                );
            })
            .slice(0, 5)
            .map((blog: any) => ({
                title: blog.title,
                url: blog.url,
                cover_image: blog.cover_image ?? "/default-blog.jpeg",
            }));
    } catch (e) {
        console.error("Blog fetch error:", e);
        return [];
    }
};

const SkillBlogs = () => {
    const { state } = useAppContext();
    const missingSkills = state.missingSkills || [];
    const [blogs, setBlogs] = useState<Record<string, Blog[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadBlogs = async () => {
            setLoading(true);

            let cached: SkillBlogCache = {};
            try {
                cached = JSON.parse(localStorage.getItem("skillBlogsCache") || "{}");
            } catch {
                cached = {};
            }

            const updatedCache: SkillBlogCache = { ...cached };
            const result: Record<string, Blog[]> = {};

            for (const skill of missingSkills) {
                const cacheEntry = cached[skill];

                const isValidCache =
                    cacheEntry &&
                    Array.isArray(cacheEntry.blogs) &&
                    Date.now() - cacheEntry.timestamp < CACHE_EXPIRY;

                if (isValidCache) {
                    result[skill] = cacheEntry.blogs;
                } else {
                    const freshBlogs = await fetchBlogsFromAPI(skill);
                    result[skill] = freshBlogs;

                    updatedCache[skill] = {
                        blogs: freshBlogs,
                        timestamp: Date.now(),
                    };
                }
            }

            localStorage.setItem("skillBlogsCache", JSON.stringify(updatedCache));

            setBlogs(result);
            setLoading(false);
        };

        if (missingSkills.length > 0) loadBlogs();
    }, [missingSkills]);

    if (loading)
        return (
            <p className="text-center text-[#B6B6B6] py-8 font-inter">
                Fetching latest blogs...
            </p>
        );

    return (
        <div className="flex flex-col space-y-8 bg-[#11011E]">
            {missingSkills.map((skill) => (
                <Card
                    key={skill}
                    className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] shadow-md rounded-xl p-5"
                >
                    <CardHeader className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <BookOpen className="h-5 w-5 text-[#0FAE96]" />
                            <CardTitle className="text-lg font-raleway font-bold text-[#ECF1F0]">
                                {skill} — Recommended Blogs
                            </CardTitle>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                            {blogs[skill]?.length > 0 ? (
                                blogs[skill].map((blog, idx) => (
                                    <a
                                        key={idx}
                                        href={blog.url}
                                        target="_blank"
                                        className="rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] hover:border-[#0FAE96] transition-all duration-300 overflow-hidden"
                                    >
                                        <div className="relative w-full h-40 overflow-hidden">
                                            <img
                                                src={blog.cover_image}
                                                alt={blog.title}
                                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                            />
                                        </div>

                                        <div className="p-3 flex justify-between items-start">
                                            <p className="text-sm text-[#ECF1F0] font-raleway font-semibold leading-tight line-clamp-2">
                                                {blog.title}
                                            </p>
                                            <ExternalLink className="h-4 w-4 text-[#0FAE96]" />
                                        </div>
                                    </a>
                                ))
                            ) : (
                                <p className="text-[#B6B6B6] text-sm font-inter">
                                    No blogs found.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
};

export default SkillBlogs;
