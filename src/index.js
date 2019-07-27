const https = require('https');
const axios = require('axios');
const instance = axios.create({ httpsAgent: new https.Agent({ rejectUnauthorized: false }) });

/**
 * settings @see `setting.example.json`
 */
const settings = require('./settings.json');
const { baseHost, token, groupIds, projectIds, groupVars, projectVars } = settings;
const options = { headers: { 'PRIVATE-TOKEN': token } };

function combine(varList) {
    if (!varList) return {};
    const { privateVars, publicVars } = varList;
    return Object.keys(publicVars).map((label) => { return { label, value: publicVars[label], protected: false } })
        .concat(Object.keys(privateVars).map((label) => { return { label, value: privateVars[label], protected: true } }))
        .reduce((r, i) => { r[i.label] = i; return r; }, {});
}

function update(itemIds, varsData, type) {
    type = type.slice(-1) === 's' ? type.slice(0, -1) : type;
    const apiType = `${type}s`;
    itemIds.forEach(async (itemId) => {
        try {
            var { data: variablesExists } = await instance.get(`${baseHost}/${apiType}/${itemId}/variables`, options);
        } catch (error) {
            return console.log(error);
        }

        const variablesKeyExists = variablesExists.map((variable) => variable.key);
        const newVariableKeys = Object.keys(varsData).filter((key) => !variablesKeyExists.includes(key));

        variablesKeyExists.forEach(async (key) => {
            if (!varsData[key]) return;
            const { value, protected } = varsData[key];
            try {
                await instance.put(`${baseHost}/${apiType}/${itemId}/variables/${key}`, `value=${value}&protected=${protected}`, options);
            } catch (error) {
                return console.log(error);
            }
            console.log(`Update #${itemId} ${type}: [${key}]`);
        });

        newVariableKeys.forEach(async (key) => {
            if (!varsData[key]) return;
            const { value, protected } = varsData[key];
            try {
                await instance.post(`${baseHost}/${apiType}/${itemId}/variables`, `key=${key}&value=${value}&protected=${protected}`, options);
            } catch (error) {
                return console.log(error);
            }
            console.log(`Create #${itemId} ${apiType}: [${key}]`);
        });

        if (settings[`${type}Vars:${itemId}`]) {
            const itemData = combine(settings[`${type}Vars:${itemId}`]);
            delete settings[`${type}Vars:${itemId}`];
            update([itemId], itemData, type);
        }
    });
}

const groupsVarsList = combine(groupVars);
const projectVarsList = combine(projectVars);

update(groupIds, groupsVarsList, 'group');
update(projectIds, projectVarsList, 'project');
