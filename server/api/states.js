import {TuyaContext} from '@tuya/tuya-connector-nodejs';
import {readFile} from 'fs/promises'
import {resolve} from 'path'

let TUYA, BUILDING, BUILDING_STR, STRATEGY = [], DEVICE_TO_CATEGORY_MAP = {}, REGION = "CN",
    MOCK = process.env.mock === "true", inited = false;

export default defineEventHandler(async (event) => {
    if (MOCK) {
        return mockData(getQuery(event).gender)
    }
    if (!inited) {
        await initConfig();
        inited = true;
    }
    return await getDeviceStatus(getQuery(event).gender);
})

async function getDeviceStatus(gender) {
    // 根据性别过滤设备列表
    if (BUILDING_STR === undefined) return;
    const curBuilding = JSON.parse(BUILDING_STR);
    const allDevices = curBuilding.wc.reduce((devices, floor) => {
        const floorDevices = floor.list
            .filter(item => gender.includes(item.gender)) // 根据 gender 过滤
            .reduce((devices, item) => {
                return devices.concat(item.devices);
            }, []);
        return devices.concat(floorDevices);
    }, []);

    // 分页查询设备状态并汇总 key:设备 id， value:true/false  true 表示坑位空闲可用
    let deviceStatusMap = {};
    for (let i = 0; i < allDevices.length; i += 20) {
        const response = await TUYA.request({
            method: 'GET',
            path: '/v1.0/iot-03/devices/status',
            query: {
                device_ids: allDevices.slice(i, i + 20).join(',')
            }
        });
        response.result?.forEach(device => {
            // 找到指定的 device.status 中的 code 字段，其中 code 的值根据 设备 id => category => strategy => code 的映射关系
            const category = DEVICE_TO_CATEGORY_MAP[device.id];
            const strategy = STRATEGY.find(item => item.category === category);
            const strategyCode = strategy.code;
            const strategyValue = strategy.value;
            const currentValue = device.status.find(status => status.code === strategyCode).value;
            deviceStatusMap[device.id] = strategyValue === currentValue;
        });
    }
    // 构建页面所需数据结构
    return {
        ...curBuilding,
        wc: curBuilding.wc.map(floor => {
            const filteredList = floor.list.filter(item => gender.includes(item.gender)); // 根据 gender 过滤
            const totalCapacity = filteredList.reduce((total, item) => {
                const availableDevices = item.devices.filter(deviceId => deviceStatusMap[deviceId]);
                return total + availableDevices.length;
            }, 0);
            return {
                ...floor,
                list: filteredList.map(item => ({
                    ...item,
                    capacity: item.devices.reduce((total, deviceId) => total + (deviceStatusMap[deviceId] ? 1 : 0), 0) // 根据 deviceStatusMap 计算 capacity
                })),
                capacity: totalCapacity // 添加新的 capacity 属性
            };
        })
    };
}

async function initConfig() {
    const filePath = resolve(process.cwd(), 'config.json')
    const fileContent = await readFile(filePath, 'utf-8')
    const config = JSON.parse(fileContent)

    // 初始化 TuyaContext 如果配置文件中有 region 字段，则使用配置文件中的 region，否则使用默认值
    REGION = config.region || REGION;
    TUYA = new TuyaContext({
        baseUrl: TUYA_REGION[REGION],
        accessKey: config.access_key,
        secretKey: config.secret_key,
    });

    // 初始化建筑信息
    BUILDING = config.building;
    BUILDING_STR = JSON.stringify(BUILDING);

    // 初始化策略信息
    STRATEGY = config.strategy;

    // 初始化设备与类别映射
    const allDevices = BUILDING.wc.reduce((devices, floor) => {
        const floorDevices = floor.list.reduce((devices, item) => {
            return devices.concat(item.devices);
        }, []);
        return devices.concat(floorDevices);
    }, []);
    // 分批调用接口：GET:/v2.0/cloud/thing/batch 查询设备信息 每次最多查询20个, 汇总所有结果
    let map = {};
    for (let i = 0; i < allDevices.length; i += 20) {
        const response = await TUYA.request({
            method: 'GET',
            path: '/v2.0/cloud/thing/batch',
            query: {
                device_ids: allDevices.slice(i, i + 20).join(',')
            }
        });
        response.result?.forEach(device => {
            map[device.id] = device.category;
        });
    }
    DEVICE_TO_CATEGORY_MAP = map;
}

/**
 * 中国数据中心	https://openapi.tuyacn.com
 * 美西数据中心	https://openapi.tuyaus.com
 * 美东数据中心	https://openapi-ueaz.tuyaus.com
 * 中欧数据中心	https://openapi.tuyaeu.com
 * 西欧数据中心	https://openapi-weaz.tuyaeu.com
 * 印度数据中心	https://openapi.tuyain.com
 * @type {{CN: string}}
 */
const TUYA_REGION = {
    "CN": "https://openapi.tuyacn.com",
    "US": "https://openapi.tuyaus.com",
    "UEAZ": "https://openapi-ueaz.tuyaus.com",
    "EU": "https://openapi.tuyaeu.com",
    "WEAZ": "https://openapi-weaz.tuyaeu.com",
    "IND": "https://openapi.tuyain.com"
}
function mockData(gender) {
    let ret = [];
    for (let i = Math.floor((Math.random() + 0.3) * 10); i > 0 ; i--) {
        const floor = `${i + 1}楼`;
        const list = [];
        for (let j = 0; j < 4; j++) {
            list.push({
                location: ['东', '南', '西', '北'][j],
                capacity: Math.floor(Math.random() * 4) + 1,
                gender: gender.length === 1 ? gender : Math.random() > 0.5 ? '男' : '女'
            })
        }
        ret.push({floor, list})
    }
    return {"name":"寻坑无忧","wc":ret};
}