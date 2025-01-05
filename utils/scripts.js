import { HttpsProxyAgent } from "https-proxy-agent";
import fetch from "node-fetch";
import log from "./logger.js";

// API URL
const apiUrl = "https://pro-api.animix.tech";

// requests with retries using proxies
async function requestWithRetry(endpoint, options, retries = 3, proxy = null) {
    const url = `${apiUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const requestOptions = {
        ...options,
        signal: controller.signal,
    };

    if (proxy) {
        requestOptions.agent = new HttpsProxyAgent(proxy);
    }

    try {
        const response = await fetch(url, requestOptions);
        clearTimeout(timeoutId);

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        if (retries > 0) {
            log.warn(`Retrying request to ${url}. Attempts left: ${retries}`);
            return await requestWithRetry(endpoint, options, retries - 1);
        }
        log.error(`Request to ${url} failed after 3 retries:`, error);
        return null;
    }
};

// Fetch mission list
export async function fetchMissionList(headers, proxy) {
    const data = await requestWithRetry("/public/mission/list", { method: "GET", headers }, 3, proxy);
    return data?.result || [];
}

// Fetch user info
export async function fetchUserInfo(headers, proxy) {
    const data = await requestWithRetry("/public/user/info", { method: "GET", headers }, 3, proxy);
    return data || {};
}

// Fetch all achievements
export async function fetchAllAchievements(headers, proxy) {
    const data = await requestWithRetry("/public/achievement/list", { method: "GET", headers }, 3, proxy);
    const allAchievements = Object.values(data?.result || {})
        .flatMap(quest => quest.achievements)
        .filter(quest => quest.status === true && quest.claimed === false)
        .map(quest => quest.quest_id);
    return allAchievements;
}

// Fetch pet list
export async function fetchPetList(headers, proxy) {
    const data = await requestWithRetry("/public/pet/list", { method: "GET", headers }, 3, proxy);
    if (!data || !data.result) {
        return { petIdsByStarAndClass: {}, allPetIds: [] };
    };
    const petIdsByStarAndClass = {};
    const allPetIds = [];

    for (const pet of data.result) {
        if (!petIdsByStarAndClass[pet.star]) petIdsByStarAndClass[pet.star] = {};
        if (!petIdsByStarAndClass[pet.star][pet.class]) petIdsByStarAndClass[pet.star][pet.class] = [];

        const petAmount = parseInt(pet.amount, 10);

        for (let i = 0; i < petAmount; i++) {
            petIdsByStarAndClass[pet.star][pet.class].push(pet.pet_id);
            allPetIds.push(pet.pet_id);
        }
    }

    return { petIdsByStarAndClass, allPetIds };
}

// Fetch pet DNA list
export async function fetchPetDnaList(headers, proxy) {
    const data = await requestWithRetry("/public/pet/dna/list", { method: "GET", headers }, 3, proxy);
    if (!data || !data.result) {
        return { momPetIds: [], dadPetIds: [], allPetIds: [] };
    }
    const momPetIds = [];
    const dadPetIds = [];
    const allPetIds = [];

    for (const pet of data.result) {
        const petAmount = parseInt(pet.amount, 10);
        for (let i = 0; i < petAmount; i++) {
            allPetIds.push(pet.item_id);
            if (pet.can_mom) {
                momPetIds.push(pet.item_id);
            } else {
                dadPetIds.push(pet.item_id);
            }
        }
    }

    return { momPetIds, dadPetIds, allPetIds };
}

// Fetch quest list
export async function fetchQuestList(headers, proxy) {
    const data = await requestWithRetry("/public/quest/list", { method: "GET", headers }, 3, proxy);
    return data?.result?.quests
        .filter(quest => quest.status === false)
        .map(quest => quest.quest_code) || [];
}

// Fetch season pass list
export async function fetchSeasonPass(headers, proxy) {
    const data = await requestWithRetry("/public/season-pass/list", { method: "GET", headers }, 3, proxy);
    return data?.result || [];
}

// Fetch bonus gatcha
export async function fetchGatchaBonus(headers, proxy) {
    const data = await requestWithRetry("/public/pet/dna/gacha/bonus", { method: "GET", headers }, 3, proxy);
    return data?.result || [];
}
// Claim bonus gatcha 
export async function claimGatchaBonus(headers, proxy, reward_no) {
    const payload = { reward_no };
    const data = await requestWithRetry("/public/pet/dna/gacha/bonus/claim", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    }, 3, proxy);
    if (data?.result) {
        log.info("Gatcha Bonus claimed successfully:", data.result);
    }
}
// Claim season pass
export async function claimSeasonPass(headers, proxy, seasonId, type, step) {
    const payload = { season_id: seasonId, type, step };
    const data = await requestWithRetry("/public/season-pass/claim", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    }, 3, proxy);
    if (data?.result) {
        log.info("Season Pass claimed successfully:", data.result);
    }
}

// Claim mission
export async function claimMission(headers, proxy, missionId) {
    const payload = { mission_id: missionId };
    const data = await requestWithRetry("/public/mission/claim", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    }, 3, proxy);
    if (data?.result) {
        log.info("Mission claimed successfully:", data.result);
    }
}

// Mix pet
export async function indehoy(headers, proxy, mom, dad) {
    const payload = { dad_id: dad, mom_id: mom };
    const data = await requestWithRetry("/public/pet/mix", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    }, 3, proxy);
    const pet = data?.result?.pet || { name: "Unknown", star: 0, class: "Unknown" };
    const petInfo = { name: pet.name, star: pet.star, class: pet.class };
    log.info(`Indehoy ah ah successfully!😘 Born:`, JSON.stringify(petInfo));
}

// Join mission
export async function joinMission(headers, proxy, payloadMission) {
    const data = await requestWithRetry("/public/mission/enter", {
        method: "POST",
        headers,
        body: JSON.stringify(payloadMission),
    }, 3, proxy);
    if (data?.result?.createdAt) {
        log.info("Joined mission successfully at:", data.result.createdAt);
    }
}

// Join clan
export async function joinClan(headers, proxy) {
    const data = await requestWithRetry("/public/clan/join", {
        method: "POST",
        headers,
        body: JSON.stringify({ clan_id: 97 }),
    }, 3, proxy);
    if (data?.result) {
        log.info("Joined clan successfully:", data.result);
    }
}

// Check in for quest
export async function checkIn(headers, proxy, questCode) {
    const data = await requestWithRetry("/public/quest/check", {
        method: "POST",
        headers,
        body: JSON.stringify({ quest_code: questCode }),
    }, 3, proxy);
    if (data?.result?.status) {
        log.info(`Quest ${questCode} claimed successfully:`, data.result.status);
    }
}

// Claim achievement
export async function claimAchievement(headers, proxy, questId) {
    const data = await requestWithRetry("/public/achievement/claim", {
        method: "POST",
        headers,
        body: JSON.stringify({ quest_id: questId }),
    }, 3, proxy);
    if (data?.result?.status) {
        log.info(`Achievement ${questId} claimed successfully:`, data.result.status);
    }
}

// Gatcha new pet
export async function getNewPet(headers, proxy) {
    const data = await requestWithRetry("/public/pet/dna/gacha", {
        method: "POST",
        headers,
        body: JSON.stringify({ amount: 1 }),
    }, 3, proxy);
    const pet = data?.result?.dna[0] || { name: "Unknown", star: 0, class: "Unknown" };
    const petInfo = { name: pet.name, star: pet.star, class: pet.class };
    const godPower = data?.result?.god_power || 0;
    log.info("Gacha New Pet Success!", JSON.stringify(petInfo));
    return godPower;
}
