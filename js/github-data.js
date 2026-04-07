(function (global) {
    "use strict";

    var CACHE_PREFIX = "github-portfolio-cache-v2:";
    var CACHE_TTL = 60 * 1000;
    var TOP_LANGUAGE_LIMIT = 4;
    var TOP_TOPIC_LIMIT = 4;

    function safeLower(value) {
        return String(value || "").toLowerCase();
    }

    function slugify(value) {
        return safeLower(value)
            .replace(/#/g, " sharp ")
            .replace(/\+/g, " plus ")
            .replace(/\./g, " dot ")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
    }

    function formatToken(token) {
        var normalized = safeLower(token);
        var aliases = {
            ai: "AI",
            api: "API",
            css: "CSS",
            html: "HTML",
            ios: "iOS",
            js: "JS",
            json: "JSON",
            sql: "SQL",
            svg: "SVG",
            ui: "UI",
            ux: "UX",
            yolo: "YOLO",
            github: "GitHub",
            typescript: "TypeScript",
            javascript: "JavaScript"
        };

        if (aliases[normalized]) {
            return aliases[normalized];
        }

        return token.charAt(0).toUpperCase() + token.slice(1);
    }

    function topicToLabel(topic) {
        return String(topic || "")
            .split(/[-_.]+/)
            .filter(Boolean)
            .map(formatToken)
            .join(" ");
    }

    function compactNumber(value) {
        return new Intl.NumberFormat("tr-TR", {
            notation: "compact",
            maximumFractionDigits: 1
        }).format(Number(value) || 0);
    }

    function formatDate(value) {
        if (!value) {
            return "";
        }

        return new Date(value).toLocaleDateString("tr-TR", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    }

    function fetchJson(url) {
        return fetch(url, {
            headers: {
                Accept: "application/vnd.github+json"
            }
        }).then(function (response) {
            if (!response.ok) {
                throw new Error("GitHub verisi alınamadı");
            }

            return response.json();
        });
    }

    function readCache(cacheKey, ttl) {
        if (!global.localStorage) {
            return null;
        }

        try {
            var rawValue = global.localStorage.getItem(cacheKey);
            if (!rawValue) {
                return null;
            }

            var parsed = JSON.parse(rawValue);
            if (!parsed || !parsed.timestamp || !parsed.data) {
                return null;
            }

            if ((Date.now() - parsed.timestamp) > ttl) {
                return {
                    isExpired: true,
                    data: parsed.data
                };
            }

            return {
                isExpired: false,
                data: parsed.data
            };
        } catch (error) {
            return null;
        }
    }

    function writeCache(cacheKey, data) {
        if (!global.localStorage) {
            return;
        }

        try {
            global.localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (error) {
            // Ignore storage quota and privacy-mode errors.
        }
    }

    function fetchAllRepos(username) {
        var page = 1;
        var perPage = 100;
        var allRepos = [];

        function nextPage() {
            return fetchJson("https://api.github.com/users/" + username + "/repos?per_page=" + perPage + "&sort=updated&page=" + page).then(function (repos) {
                allRepos = allRepos.concat(repos);

                if (repos.length === perPage) {
                    page += 1;
                    return nextPage();
                }

                return allRepos;
            });
        }

        return nextPage();
    }

    function normalizeLanguages(languageMap) {
        return Object.keys(languageMap || {}).map(function (key) {
            return {
                label: key,
                slug: slugify(key),
                value: languageMap[key],
                kind: "language"
            };
        }).sort(function (left, right) {
            return right.value - left.value;
        }).slice(0, TOP_LANGUAGE_LIMIT);
    }

    function normalizeTopics(topics) {
        return (topics || []).slice(0, TOP_TOPIC_LIMIT).map(function (topic) {
            var label = topicToLabel(topic);
            return {
                label: label,
                slug: slugify(label),
                value: 0,
                kind: "topic"
            };
        });
    }

    function mergeTechnologies(languages, topics, primaryLanguage) {
        var merged = new Map();

        function addTechnology(item) {
            if (!item || !item.label || merged.has(item.slug)) {
                return;
            }

            merged.set(item.slug, item);
        }

        languages.forEach(addTechnology);
        topics.forEach(addTechnology);

        if (primaryLanguage) {
            addTechnology({
                label: primaryLanguage,
                slug: slugify(primaryLanguage),
                value: 0,
                kind: "language"
            });
        }

        return Array.from(merged.values());
    }

    function buildTechnologyIndex(repos) {
        var technologyMap = new Map();

        repos.forEach(function (repo) {
            repo.technologies.forEach(function (technology) {
                if (!technologyMap.has(technology.slug)) {
                    technologyMap.set(technology.slug, {
                        slug: technology.slug,
                        label: technology.label,
                        kind: technology.kind,
                        repos: []
                    });
                }

                technologyMap.get(technology.slug).repos.push({
                    name: repo.name,
                    label: repo.name,
                    htmlUrl: repo.htmlUrl
                });
            });
        });

        return Array.from(technologyMap.values()).sort(function (left, right) {
            if (right.repos.length !== left.repos.length) {
                return right.repos.length - left.repos.length;
            }

            return left.label.localeCompare(right.label, "tr");
        });
    }

    function normalizeRepo(repo, languages) {
        var topics = normalizeTopics(repo.topics);
        var mergedTechnologies = mergeTechnologies(languages, topics, repo.language);

        return {
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            htmlUrl: repo.html_url,
            homepage: repo.homepage,
            description: repo.description,
            isFork: Boolean(repo.fork),
            isArchived: Boolean(repo.archived),
            defaultBranch: repo.default_branch,
            primaryLanguage: repo.language,
            watchersCount: Number(repo.watchers_count) || 0,
            stargazersCount: Number(repo.stargazers_count) || 0,
            forksCount: Number(repo.forks_count) || 0,
            openIssuesCount: Number(repo.open_issues_count) || 0,
            updatedAt: repo.updated_at,
            pushedAt: repo.pushed_at,
            createdAt: repo.created_at,
            languages: languages,
            topics: topics,
            technologies: mergedTechnologies
        };
    }

    function fetchPortfolioData(username) {
        return Promise.all([
            fetchJson("https://api.github.com/users/" + username),
            fetchAllRepos(username)
        ]).then(function (results) {
            var profile = results[0];
            var repos = results[1].sort(function (left, right) {
                return new Date(right.pushed_at || right.updated_at || 0) - new Date(left.pushed_at || left.updated_at || 0);
            });

            return Promise.all(repos.map(function (repo) {
                return fetchJson(repo.languages_url).catch(function () {
                    return {};
                }).then(function (languageMap) {
                    return normalizeRepo(repo, normalizeLanguages(languageMap));
                });
            })).then(function (normalizedRepos) {
                var technologies = buildTechnologyIndex(normalizedRepos);

                return {
                    fetchedAt: new Date().toISOString(),
                    profile: {
                        login: profile.login,
                        htmlUrl: profile.html_url,
                        followers: Number(profile.followers) || 0,
                        publicRepos: Number(profile.public_repos) || normalizedRepos.length
                    },
                    repos: normalizedRepos,
                    technologies: technologies,
                    stats: {
                        repoCount: normalizedRepos.length,
                        technologyCount: technologies.length
                    }
                };
            });
        });
    }

    function loadPortfolio(username, options) {
        var settings = options || {};
        var cacheTtl = typeof settings.cacheTtl === "number" ? settings.cacheTtl : CACHE_TTL;
        var cacheKey = CACHE_PREFIX + username;
        var cached = readCache(cacheKey, cacheTtl);

        if (cached && !cached.isExpired) {
            return Promise.resolve(cached.data);
        }

        return fetchPortfolioData(username).then(function (data) {
            writeCache(cacheKey, data);
            return data;
        }).catch(function (error) {
            if (cached && cached.data) {
                return cached.data;
            }

            throw error;
        });
    }

    global.GitHubPortfolioData = {
        compactNumber: compactNumber,
        formatDate: formatDate,
        loadPortfolio: loadPortfolio,
        slugify: slugify,
        topicToLabel: topicToLabel
    };
})(window);
