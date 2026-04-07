(function (global) {
    "use strict";

    var username = "NAKI667";
    var gridEl = document.getElementById("live-projects-grid");
    if (!gridEl || !global.GitHubPortfolioData) {
        return;
    }

    var statusEl = document.getElementById("projects-status");
    var repoTotalEl = document.getElementById("projects-repo-total");
    var techTotalEl = document.getElementById("projects-tech-total");
    var lastSyncEl = document.getElementById("projects-last-sync");

    function setStatus(message, isError) {
        if (!statusEl) {
            return;
        }

        statusEl.textContent = message;
        statusEl.classList.toggle("project-feed-status--error", Boolean(isError));
    }

    function clearNode(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
    }

    function createElement(tagName, className, text) {
        var node = document.createElement(tagName);

        if (className) {
            node.className = className;
        }

        if (typeof text === "string") {
            node.textContent = text;
        }

        return node;
    }

    function createStat(label, value) {
        var wrapper = createElement("div", "project-meta-item");
        var term = createElement("dt", "", label);
        var description = createElement("dd", "", value);

        wrapper.appendChild(term);
        wrapper.appendChild(description);
        return wrapper;
    }

    function createCard(repo) {
        var article = createElement("article", "project-card project-card--live");
        var header = createElement("div", "project-card__header");
        var eyebrow = createElement("p", "eyebrow", "GitHub Public Repo");
        var badgeRow = createElement("div", "project-card__badges");
        var title = createElement("h3", "", repo.name);
        var description = createElement("p", "project-desc", repo.description || "Bu repo için GitHub üzerinde açıklama girilmemiş.");
        var stats = createElement("dl", "project-meta-grid");
        var techStack = createElement("div", "tech-stack");
        var status = createElement("p", "project-status");
        var actions = createElement("div", "project-card__actions");
        var repoLink = createElement("a", "project-link", "Repo'yu Aç");

        repoLink.href = repo.htmlUrl;
        repoLink.target = "_blank";
        repoLink.rel = "noreferrer";

        if (repo.isFork) {
            badgeRow.appendChild(createElement("span", "tech-tag tech-tag--muted", "Fork"));
        }

        if (repo.isArchived) {
            badgeRow.appendChild(createElement("span", "tech-tag tech-tag--muted", "Arşiv"));
        }

        if (repo.homepage) {
            badgeRow.appendChild(createElement("span", "tech-tag", "Canlı Demo"));
        }

        header.appendChild(eyebrow);
        if (badgeRow.childNodes.length) {
            header.appendChild(badgeRow);
        }

        stats.appendChild(createStat("İzleyici", global.GitHubPortfolioData.compactNumber(repo.watchersCount)));
        stats.appendChild(createStat("Fork", global.GitHubPortfolioData.compactNumber(repo.forksCount)));
        stats.appendChild(createStat("Açık issue", global.GitHubPortfolioData.compactNumber(repo.openIssuesCount)));
        stats.appendChild(createStat("Ana dal", repo.defaultBranch || "-"));

        (repo.technologies.length ? repo.technologies : []).slice(0, 8).forEach(function (technology) {
            techStack.appendChild(createElement("span", "tech-tag", technology.label));
        });

        if (!techStack.childNodes.length) {
            techStack.appendChild(createElement("span", "tech-tag", "Teknoloji verisi bekleniyor"));
        }

        status.textContent = "Son push: " + global.GitHubPortfolioData.formatDate(repo.pushedAt || repo.updatedAt);

        actions.appendChild(repoLink);

        if (repo.homepage) {
            var demoLink = createElement("a", "project-link", "Canlı Demo");
            demoLink.href = repo.homepage;
            demoLink.target = "_blank";
            demoLink.rel = "noreferrer";
            actions.appendChild(demoLink);
        }

        article.appendChild(header);
        article.appendChild(title);
        article.appendChild(description);
        article.appendChild(stats);
        article.appendChild(techStack);
        article.appendChild(status);
        article.appendChild(actions);

        return article;
    }

    function renderEmptyState(message) {
        clearNode(gridEl);

        var emptyCard = createElement("article", "project-card project-card--live project-card--empty");
        emptyCard.appendChild(createElement("p", "eyebrow", "GitHub Akışı"));
        emptyCard.appendChild(createElement("h3", "", "Gösterilecek açık repo bulunamadı"));
        emptyCard.appendChild(createElement("p", "project-desc", message));
        gridEl.appendChild(emptyCard);
    }

    setStatus("GitHub repoları yükleniyor...", false);

    global.GitHubPortfolioData.loadPortfolio(username).then(function (data) {
        clearNode(gridEl);

        if (!data.repos.length) {
            if (repoTotalEl) {
                repoTotalEl.textContent = "Repo: 0";
            }

            if (techTotalEl) {
                techTotalEl.textContent = "Teknoloji: 0";
            }

            if (lastSyncEl) {
                lastSyncEl.textContent = "Senkron: " + global.GitHubPortfolioData.formatDate(data.fetchedAt);
            }

            setStatus("Açık repo bulunamadı.", false);
            renderEmptyState("Profildeki açık repolar şu anda listelenemedi.");
            return;
        }

        data.repos.forEach(function (repo) {
            gridEl.appendChild(createCard(repo));
        });

        if (repoTotalEl) {
            repoTotalEl.textContent = "Repo: " + data.stats.repoCount;
        }

        if (techTotalEl) {
            techTotalEl.textContent = "Teknoloji: " + data.stats.technologyCount;
        }

        if (lastSyncEl) {
            lastSyncEl.textContent = "Senkron: " + global.GitHubPortfolioData.formatDate(data.fetchedAt);
        }

        setStatus(data.stats.repoCount + " açık repo canlı olarak listelendi.", false);
    }).catch(function (error) {
        console.error(error);

        if (repoTotalEl) {
            repoTotalEl.textContent = "Repo: X";
        }

        if (techTotalEl) {
            techTotalEl.textContent = "Teknoloji: X";
        }

        if (lastSyncEl) {
            lastSyncEl.textContent = "Senkron: hata";
        }

        renderEmptyState("GitHub API erişimi nedeniyle repo kartları hazırlanamadı. Daha sonra tekrar deneyebilirsin.");
        setStatus("GitHub repo akışı yüklenemedi.", true);
    });
})(window);
