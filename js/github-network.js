(function (global) {
    "use strict";

    var username = "NAKI667";
    var svg = document.getElementById("github-network");
    if (!svg || !global.GitHubPortfolioData) {
        return;
    }

    var networkStage = svg.closest(".network-stage");
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
        if (statusEl) {
            statusEl.hidden = true;
        }
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
        if (titleEl) {
            titleEl.textContent = title;
        }

        if (descriptionEl) {
            descriptionEl.textContent = description;
        }

        if (tagsEl) {
            clearNode(tagsEl);
            (tags || []).forEach(function (tag) {
                var chip = document.createElement("span");
                chip.className = "chip";
                chip.textContent = tag;
                tagsEl.appendChild(chip);
            });
        }

        if (!linkEl) {
            return;
        }

        if (link) {
            linkEl.hidden = false;
            linkEl.href = link;
            linkEl.textContent = linkLabel || "Repo'yu Aç";
        } else {
            linkEl.hidden = true;
            linkEl.removeAttribute("href");
        }
    }

    function splitLabel(label, maxLength) {
        var prepared = String(label || "").replace(/[._-]+/g, " ").trim();
        var words = prepared.split(/\s+/).filter(Boolean);
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

        return lines.slice(0, 3);
    }

    function formatRepoDescription(repo) {
        var technologies = repo.technologies.map(function (item) { return item.label; }).slice(0, 6);
        var segments = [];

        if (technologies.length) {
            segments.push("Teknolojiler: " + technologies.join(", "));
        } else {
            segments.push("Bu repo için görünür teknoloji verisi henüz alınamadı.");
        }

        segments.push("İzleyici: " + global.GitHubPortfolioData.compactNumber(repo.watchersCount));
        segments.push("Fork: " + global.GitHubPortfolioData.compactNumber(repo.forksCount));
        segments.push("Açık issue: " + global.GitHubPortfolioData.compactNumber(repo.openIssuesCount));

        if (repo.pushedAt || repo.updatedAt) {
            segments.push("Son güncelleme: " + global.GitHubPortfolioData.formatDate(repo.pushedAt || repo.updatedAt));
        }

        return segments.join(" | ");
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

    function assignRingPositions(items, config) {
        var maxPerRing = config.maxPerRing;
        var ringCount = Math.max(1, Math.ceil(items.length / maxPerRing));

        for (var ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
            var start = ringIndex * maxPerRing;
            var group = items.slice(start, start + maxPerRing);
            var radiusX = config.baseRadiusX + (ringIndex * config.ringGapX);
            var radiusY = config.baseRadiusY + (ringIndex * config.ringGapY);

            group.forEach(function (item, index) {
                var angle = (Math.PI * 2 * index) / group.length - (Math.PI / 2);
                item.x = config.centerX + Math.cos(angle) * radiusX;
                item.y = config.centerY + Math.sin(angle) * radiusY;
            });
        }

        return {
            ringCount: ringCount,
            outerRadiusX: config.baseRadiusX + ((ringCount - 1) * config.ringGapX),
            outerRadiusY: config.baseRadiusY + ((ringCount - 1) * config.ringGapY)
        };
    }

    function buildGraph(profile, repos, technologies) {
        clearNode(svg);

        var techLayout = assignRingPositions(technologies, {
            centerX: 0,
            centerY: 0,
            baseRadiusX: 310,
            baseRadiusY: 220,
            ringGapX: 95,
            ringGapY: 82,
            maxPerRing: 16
        });
        assignRingPositions(repos, {
            centerX: 0,
            centerY: 0,
            baseRadiusX: 190,
            baseRadiusY: 140,
            ringGapX: 72,
            ringGapY: 56,
            maxPerRing: 10
        });
        var width = Math.max(920, (techLayout.outerRadiusX + 190) * 2);
        var height = Math.max(620, (techLayout.outerRadiusY + 180) * 2);
        var centerX = width / 2;
        var centerY = height / 2;
        var allNodes = [];
        var allEdges = [];
        var lineLayer = createSvgElement("g", { class: "network-lines" });
        var nodeLayer = createSvgElement("g", { class: "network-nodes" });

        svg.setAttribute("viewBox", "0 0 " + width + " " + height);
        if (networkStage) {
            networkStage.style.minHeight = Math.round(height) + "px";
        }

        repos.forEach(function (repo) {
            repo.x += centerX;
            repo.y += centerY;
            repo.id = "repo-" + repo.name;
            repo.connections = repo.technologies.map(function (technology) { return "tech-" + technology.slug; }).concat(["user"]);
        });

        technologies.forEach(function (technology) {
            technology.x += centerX;
            technology.y += centerY;
            technology.id = "tech-" + technology.slug;
            technology.connections = technology.repos.map(function (repo) { return "repo-" + repo.name; });
        });

        svg.appendChild(lineLayer);
        svg.appendChild(nodeLayer);

        var userNode = {
            id: "user",
            type: "user",
            label: profile.login || username,
            x: centerX,
            y: centerY,
            size: 58,
            connections: repos.map(function (repo) { return repo.id; })
        };

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

            repo.technologies.forEach(function (technology) {
                var techNode = technologies.find(function (item) { return item.slug === technology.slug; });
                if (!techNode) {
                    return;
                }

                var repoEdge = createSvgElement("line", {
                    class: "network-link-line network-link-line--tech",
                    x1: repo.x,
                    y1: repo.y,
                    x2: techNode.x,
                    y2: techNode.y
                });

                lineLayer.appendChild(repoEdge);
                allEdges.push({ from: repo.id, to: techNode.id, element: repoEdge });
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
                r: nodeData.size || 28
            });
            var text = createSvgElement("text", {
                class: "network-label",
                "text-anchor": "middle",
                y: nodeData.type === "user" ? 6 : 44
            });

            labelLines.forEach(function (line, index) {
                var tspan = createSvgElement("tspan", {
                    x: "0",
                    dy: index === 0 ? "0" : "1.08em"
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
                        "GitHub Portföy Ağacı",
                        "Profildeki tüm açık repolar ve bu repolarda algılanan teknolojiler canlı GitHub verisiyle otomatik çizilir.",
                        repos.map(function (repo) { return repo.name; }),
                        profile.htmlUrl,
                        "GitHub Profiline Git"
                    );
                    return;
                }

                if (nodeData.type === "repo") {
                    setDetail(
                        nodeData.label,
                        formatRepoDescription(nodeData.raw),
                        nodeData.raw.technologies.map(function (item) { return item.label; }),
                        nodeData.raw.htmlUrl,
                        "Repo'yu Aç"
                    );
                    return;
                }

                setDetail(
                    nodeData.label,
                    "Bu teknoloji şu anda " + nodeData.repos.length + " repo ile bağlantılı görünüyor.",
                    nodeData.repos.map(function (repo) { return repo.label; }),
                    null,
                    ""
                );
            }

            group.addEventListener("mouseenter", activate);
            group.addEventListener("focus", activate);
            group.addEventListener("click", function () {
                activate();
                if (nodeData.type === "repo" && nodeData.raw && nodeData.raw.htmlUrl) {
                    global.open(nodeData.raw.htmlUrl, "_blank", "noopener");
                }
            });
            group.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    group.click();
                }
            });
        }

        attachNode(userNode, splitLabel(profile.login || username, 12));

        repos.forEach(function (repo) {
            attachNode({
                id: repo.id,
                type: "repo",
                label: repo.name,
                raw: repo,
                x: repo.x,
                y: repo.y,
                size: 34,
                connections: repo.connections
            }, splitLabel(repo.name, 13));
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
            "GitHub Portföy Ağacı",
            "Yeni bir public repo açıldığında ve GitHub teknoloji verisi oluştuğunda bu ağ görünümüne otomatik olarak eklenir.",
            repos.map(function (repo) { return repo.name; }),
            profile.htmlUrl,
            "GitHub Profiline Git"
        );
        selectNode("user", allNodes, allEdges);
    }

    setStatus("GitHub verisi yükleniyor...", false);

    global.GitHubPortfolioData.loadPortfolio(username).then(function (data) {
        if (repoCountEl) {
            repoCountEl.textContent = data.stats.repoCount;
        }

        if (followerCountEl) {
            followerCountEl.textContent = data.profile.followers;
        }

        if (techTotalEl) {
            techTotalEl.textContent = data.stats.technologyCount;
        }

        buildGraph(data.profile, data.repos, data.technologies);
        hideStatus();
    }).catch(function (error) {
        console.error(error);
        setStatus("GitHub verisi yüklenemedi. Ağ görünümü şu anda kullanılamıyor.", true);
        setDetail(
            "GitHub verisi yüklenemedi",
            "API erişimi veya oran limiti nedeniyle repo ve teknoloji ağacı hazırlanamadı. Daha sonra yeniden deneyebilirsin.",
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
})(window);
