(function () {
    "use strict";

    var username = "NAKI667";
    var featuredRepos = [
        { name: "ghost-market-ui", label: "Ghost Market UI" },
        { name: "Python_Projelerim", label: "Çakırın Mekanı" },
        { name: "PSM", label: "PSM" },
        { name: "akinkokcu.github.io", label: "NAKI Portföy" }
    ];

    var svg = document.getElementById("github-network");
    if (!svg) {
        return;
    }

    var statusEl = document.getElementById("network-status");
    var titleEl = document.getElementById("network-title");
    var descriptionEl = document.getElementById("network-description");
    var tagsEl = document.getElementById("network-tags");
    var linkEl = document.getElementById("network-link");
    var repoCountEl = document.getElementById("repo-count");
    var followerCountEl = document.getElementById("follower-count");
    var techTotalEl = document.getElementById("tech-total");

    var SVG_NS = "http://www.w3.org/2000/svg";

    function setStatus(message, isError) {
        if (!statusEl) {
            return;
        }

        statusEl.textContent = message;
        statusEl.classList.toggle("network-status--error", Boolean(isError));
        statusEl.hidden = false;
    }

    function hideStatus() {
        if (!statusEl) {
            return;
        }

        statusEl.hidden = true;
    }

    function createSvgElement(tagName, attributes) {
        var node = document.createElementNS(SVG_NS, tagName);
        var key;

        for (key in attributes) {
            if (Object.prototype.hasOwnProperty.call(attributes, key)) {
                node.setAttribute(key, attributes[key]);
            }
        }

        return node;
    }

    function clearNode(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function setDetail(title, description, tags, link, linkLabel) {
        titleEl.textContent = title;
        descriptionEl.textContent = description;

        clearNode(tagsEl);
        (tags || []).forEach(function (tag) {
            var chip = document.createElement("span");
            chip.className = "chip";
            chip.textContent = tag;
            tagsEl.appendChild(chip);
        });

        if (link) {
            linkEl.hidden = false;
            linkEl.href = link;
            linkEl.textContent = linkLabel || "Repo'ya Git";
        } else {
            linkEl.hidden = true;
            linkEl.removeAttribute("href");
        }
    }

    function fetchJson(url) {
        return fetch(url).then(function (response) {
            if (!response.ok) {
                throw new Error("GitHub verisi alınamadı");
            }

            return response.json();
        });
    }

    function splitLabel(label, maxLength) {
        var words = label.split(" ");
        var lines = [];
        var current = "";

        words.forEach(function (word) {
            if ((current + " " + word).trim().length > maxLength && current) {
                lines.push(current);
                current = word;
            } else {
                current = (current + " " + word).trim();
            }
        });

        if (current) {
            lines.push(current);
        }

        if (!lines.length) {
            lines.push(label);
        }

        return lines.slice(0, 2);
    }

    function formatRepoDescription(repo, languages) {
        var updatedText = "";

        if (repo.updated_at) {
            updatedText = new Date(repo.updated_at).toLocaleDateString("tr-TR", {
                year: "numeric",
                month: "long",
                day: "numeric"
            });
        }

        if (!languages.length) {
            return "Bu repo için görünür teknoloji verisi alınamadı.";
        }

        return "Öne çıkan teknolojiler: " + languages.join(", ") + (updatedText ? ". Son güncelleme: " + updatedText + "." : ".");
    }

    function selectNode(activeId, nodes, edges) {
        nodes.forEach(function (node) {
            var isActive = node.id === activeId;
            var isConnected = !activeId || node.connections.indexOf(activeId) !== -1 || isActive;

            node.element.classList.toggle("is-active", isActive);
            node.element.classList.toggle("is-muted", !isConnected);
        });

        edges.forEach(function (edge) {
            var isActiveEdge = edge.from === activeId || edge.to === activeId;
            var isConnectedEdge = !activeId || edge.from === activeId || edge.to === activeId;

            edge.element.classList.toggle("is-active", isActiveEdge);
            edge.element.classList.toggle("is-muted", !isConnectedEdge);
        });
    }

    function buildGraph(profile, repos, technologies) {
        clearNode(svg);

        var width = 920;
        var height = 620;
        var centerX = width / 2;
        var centerY = height / 2;
        var repoRadius = 190;
        var techRadius = 285;
        var allNodes = [];
        var allEdges = [];
        var lineLayer = createSvgElement("g", { class: "network-lines" });
        var nodeLayer = createSvgElement("g", { class: "network-nodes" });

        svg.appendChild(lineLayer);
        svg.appendChild(nodeLayer);

        var userNode = {
            id: "user",
            type: "user",
            label: "NAKI",
            x: centerX,
            y: centerY,
            size: 58,
            connections: repos.map(function (repo) { return "repo-" + repo.name; }),
            description: "GitHub üzerindeki portföy merkezini temsil eden ana düğüm. Bağlı repolar ve kullanılan teknolojiler dinamik olarak çekilir."
        };

        repos.forEach(function (repo, index) {
            var angle = (Math.PI * 2 * index) / repos.length - Math.PI / 2;
            repo.x = centerX + Math.cos(angle) * repoRadius;
            repo.y = centerY + Math.sin(angle) * repoRadius;
            repo.id = "repo-" + repo.name;
            repo.connections = repo.languages.map(function (language) { return "tech-" + language.slug; }).concat(["user"]);
        });

        technologies.forEach(function (technology, index) {
            var angle = (Math.PI * 2 * index) / technologies.length - Math.PI / 2;
            technology.x = centerX + Math.cos(angle) * techRadius;
            technology.y = centerY + Math.sin(angle) * techRadius;
            technology.id = "tech-" + technology.slug;
            technology.connections = technology.repos.map(function (repo) { return "repo-" + repo.name; });
        });

        repos.forEach(function (repo) {
            var userEdge = createSvgElement("line", {
                class: "network-link-line",
                x1: userNode.x,
                y1: userNode.y,
                x2: repo.x,
                y2: repo.y
            });

            lineLayer.appendChild(userEdge);
            allEdges.push({ from: "user", to: repo.id, element: userEdge });

            repo.languages.forEach(function (language) {
                var tech = technologies.find(function (item) { return item.slug === language.slug; });
                if (!tech) {
                    return;
                }

                var repoEdge = createSvgElement("line", {
                    class: "network-link-line network-link-line--tech",
                    x1: repo.x,
                    y1: repo.y,
                    x2: tech.x,
                    y2: tech.y
                });

                lineLayer.appendChild(repoEdge);
                allEdges.push({ from: repo.id, to: tech.id, element: repoEdge });
            });
        });

        function attachNode(nodeData, labelLines) {
            var group = createSvgElement("g", {
                class: "network-node network-node--" + nodeData.type,
                tabindex: "0",
                role: "button",
                transform: "translate(" + nodeData.x + " " + nodeData.y + ")"
            });

            var circle = createSvgElement("circle", {
                r: nodeData.size || (nodeData.type === "tech" ? 24 : 34)
            });

            var text = createSvgElement("text", {
                class: "network-label",
                "text-anchor": "middle",
                y: nodeData.type === "user" ? 6 : 44
            });

            labelLines.forEach(function (line, index) {
                var tspan = createSvgElement("tspan", {
                    x: "0",
                    dy: index === 0 ? "0" : "1.1em"
                });
                tspan.textContent = line;
                text.appendChild(tspan);
            });

            group.appendChild(circle);
            group.appendChild(text);
            nodeLayer.appendChild(group);
            nodeData.element = group;
            allNodes.push(nodeData);

            function activate() {
                selectNode(nodeData.id, allNodes, allEdges);

                if (nodeData.type === "user") {
                    setDetail(
                        "GitHub Portföy Ağı",
                        "GitHub üzerinde yer alan öne çıkan repolar ve bu repolarda görünen teknolojiler arasındaki ilişkiyi gösterir.",
                        repos.map(function (repo) { return repo.label; }),
                        profile.html_url,
                        "GitHub Profiline Git"
                    );
                    return;
                }

                if (nodeData.type === "repo") {
                    setDetail(
                        nodeData.label,
                        formatRepoDescription(nodeData.raw, nodeData.languages.map(function (item) { return item.label; })),
                        nodeData.languages.map(function (item) { return item.label; }),
                        nodeData.raw.html_url,
                        "Repo'yu Aç"
                    );
                    return;
                }

                if (nodeData.type === "tech") {
                    setDetail(
                        nodeData.label,
                        "Bu teknoloji GitHub ağında " + nodeData.repos.length + " repo ile bağlantılı görünüyor.",
                        nodeData.repos.map(function (repo) { return repo.label; }),
                        null,
                        ""
                    );
                }
            }

            group.addEventListener("mouseenter", activate);
            group.addEventListener("focus", activate);
            group.addEventListener("click", function () {
                activate();
                if (nodeData.type === "repo" && nodeData.raw && nodeData.raw.html_url) {
                    window.open(nodeData.raw.html_url, "_blank", "noopener");
                }
            });

            group.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    group.click();
                }
            });
        }

        attachNode(userNode, ["NAKI", "GitHub"]);

        repos.forEach(function (repo) {
            attachNode({
                id: repo.id,
                type: "repo",
                label: repo.label,
                raw: repo.raw,
                x: repo.x,
                y: repo.y,
                size: 34,
                languages: repo.languages,
                connections: repo.connections
            }, splitLabel(repo.label, 13));
        });

        technologies.forEach(function (technology) {
            attachNode({
                id: technology.id,
                type: "tech",
                label: technology.label,
                x: technology.x,
                y: technology.y,
                size: 24,
                repos: technology.repos,
                connections: technology.connections
            }, splitLabel(technology.label, 12));
        });

        setDetail(
            "GitHub Portföy Ağı",
            "Merkez düğümden repolara, repolardan kullanılan teknolojilere uzanan ilişki ağını inceleyebilirsin.",
            repos.map(function (repo) { return repo.label; }),
            profile.html_url,
            "GitHub Profiline Git"
        );
        selectNode("user", allNodes, allEdges);
    }

    function normalizeLanguages(languageMap) {
        var entries = Object.keys(languageMap).map(function (key) {
            return { label: key, value: languageMap[key] };
        });

        entries.sort(function (left, right) {
            return right.value - left.value;
        });

        return entries.slice(0, 3).map(function (entry) {
            return {
                label: entry.label,
                slug: entry.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")
            };
        });
    }

    Promise.all([
        fetchJson("https://api.github.com/users/" + username),
        fetchJson("https://api.github.com/users/" + username + "/repos?per_page=100&sort=updated")
    ]).then(function (results) {
        var profile = results[0];
        var repos = results[1];
        var repoLookup = new Map();

        repos.forEach(function (repo) {
            repoLookup.set(repo.name.toLowerCase(), repo);
        });

        var selectedRepos = featuredRepos.map(function (meta) {
            var repo = repoLookup.get(meta.name.toLowerCase());
            if (!repo) {
                return null;
            }

            return {
                name: repo.name,
                label: meta.label,
                raw: repo
            };
        }).filter(Boolean);

        if (!selectedRepos.length) {
            throw new Error("Gösterilecek repo bulunamadı");
        }

        repoCountEl.textContent = profile.public_repos;
        followerCountEl.textContent = profile.followers;

        return Promise.all(selectedRepos.map(function (repoMeta) {
            return fetchJson(repoMeta.raw.languages_url).then(function (languageMap) {
                return {
                    name: repoMeta.name,
                    label: repoMeta.label,
                    raw: repoMeta.raw,
                    languages: normalizeLanguages(languageMap)
                };
            });
        })).then(function (repoNodes) {
            var technologyMap = new Map();

            repoNodes.forEach(function (repoNode) {
                repoNode.languages.forEach(function (language) {
                    if (!technologyMap.has(language.slug)) {
                        technologyMap.set(language.slug, {
                            slug: language.slug,
                            label: language.label,
                            repos: []
                        });
                    }

                    technologyMap.get(language.slug).repos.push({
                        name: repoNode.name,
                        label: repoNode.label
                    });
                });
            });

            var technologies = Array.from(technologyMap.values()).sort(function (left, right) {
                return right.repos.length - left.repos.length;
            });

            techTotalEl.textContent = technologies.length;
            buildGraph(profile, repoNodes, technologies);
            hideStatus();
        });
    }).catch(function (error) {
        console.error(error);
        setStatus("GitHub verisi yüklenemedi. Ağ görünümü şu anda kullanılamıyor.", true);
        setDetail(
            "GitHub verisi yüklenemedi",
            "API erişimi veya oran limiti nedeniyle repo ve teknoloji ağı hazırlanamadı. Daha sonra yeniden deneyebilirsin.",
            ["GitHub API", "Bekleyen veri"],
            "https://github.com/" + username,
            "GitHub Profiline Git"
        );

        if (repoCountEl) {
            repoCountEl.textContent = "X";
        }

        if (followerCountEl) {
            followerCountEl.textContent = "X";
        }

        if (techTotalEl) {
            techTotalEl.textContent = "X";
        }
    });
})();
