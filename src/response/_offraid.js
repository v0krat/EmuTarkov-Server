"use strict";

require("../libs.js");

function markFoundItems(pmcData, offraidData, isPlayerScav) {
   // mark items found in raid
   supLoop: for (let offraidItem of offraidData.Inventory.items) {
        // let found = false; // useless

        // mark new items for PMC, mark all items for scavs
        if (!isPlayerScav) {
            for (let item of pmcData.Inventory.items) {
                if (offraidItem._id === item._id) {
                    continue supLoop;
                }
            }

            /* if (found) { // useless
                 continue;
             } */
        }

        // mark item found in raid
        if (offraidItem.hasOwnProperty("upd")) {
            offraidItem.upd["SpawnedInSession"] = true;
        } else {
            offraidItem["upd"] = {"SpawnedInSession": true};
        }
    }

    return offraidData;
}

function setInventory(pmcData, offraidData) {
    move_f.removeItemFromProfile(pmcData, pmcData.Inventory.equipment);
    move_f.removeItemFromProfile(pmcData, pmcData.Inventory.questRaidItems);
    move_f.removeItemFromProfile(pmcData, pmcData.Inventory.questStashItems);

    for (let item of offraidData.Inventory.items) {
        pmcData.Inventory.items.push(item);
    }

    return pmcData;
}

function deleteInventory(pmcData, sessionID) {
    let items_to_delete = [];

    for (let item of pmcData.Inventory.items) {
        if (item.parentId === pmcData.Inventory.equipment
            && item.slotId !== "SecuredContainer"
            && item.slotId !== "Scabbard"
            && item.slotId !== "Pockets") {
            items_to_delete.push(item._id);
        }

        // remove pocket insides
        if (item.slotId === "Pockets") {
            for (let pocket of pmcData.Inventory.items) {
                if (pocket.parentId === item._id) {
                    items_to_delete.push(pocket._id);
                }
            }
        }
    }

    // check for insurance
    for (let item_to_delete in items_to_delete) {
        for (let insurance in pmcData.InsuredItems) {
            if (items_to_delete[item_to_delete] !== pmcData.InsuredItems[insurance].itemId) {
                continue;
            }

            let insureReturnChance = utility.getRandomInt(0, 99);
    
            if (insureReturnChance < settings.gameplay.trading.insureReturnChance) {
                move_f.removeInsurance(pmcData, items_to_delete[item_to_delete]);
                items_to_delete[item_to_delete] = "insured";
                break;
            }
        }
    }

    // finally delete them
    for (let item_to_delete in items_to_delete) {
        if (items_to_delete[item_to_delete] !== "insured") {
            move_f.removeItemFromProfile(pmcData, items_to_delete[item_to_delete]);
        }
    }

    return pmcData;
}

function saveProgress(offraidData, sessionID) {
    let offraidData = offraidData.profile;
    let pmcData = profile_f.getPmcData(sessionID);
    
    const isPlayerScav = offraidData.isPlayerScav;
    
    // set pmc data
    if (!isPlayerScav) {
        pmcData.Info.Level = offraidData.Info.Level;
        pmcData.Skills = offraidData.Skills;
        pmcData.Stats = offraidData.Stats;
        pmcData.Encyclopedia = offraidData.Encyclopedia;
        pmcData.ConditionCounters = offraidData.ConditionCounters;
        pmcData.Quests = offraidData.Quests;

        // level 69 cap to prevent visual bug occuring at level 70
        if (pmcData.Info.Experience > 13129881) {
            pmcData.Info.Experience = 13129881;
        }
    }

    // mark found items and replace item ID's
    offraidData = markFoundItems(pmcData, offraidData, isPlayerScav);
    offraidData.Inventory.items = itm_hf.replaceIDs(offraidData, offraidData.Inventory.items);
    
    // terminate early for player scavs because we don't care about whether they died.
    if (isPlayerScav) {
        let scavData = profile_f.getScavData(sessionID);
        scavData = setInventory(scavData, offraidData);
        profile_f.setScavData(scavData, sessionID);
        return;
    }
    
    // set profile equipment to the raid equipment
    pmcData = setInventory(pmcData, offraidData);


    // remove inventory if player died
    if (offraidData.exit !== "survived" && offraidData.exit !== "runner") {
        pmcData = deleteInventory(pmcData, sessionID);
    }

    profile_f.setPmcData(pmcData, sessionID);
}

module.exports.saveProgress = saveProgress;
