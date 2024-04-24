<script setup>
import {onMounted, ref, watch} from 'vue'

const gender = ref(['男','女']);

const wcInfo = ref({
  name: '寻坑无忧',
  wc: []
});

const loading = ref(false);
const finished = ref(true);

/**
 * 监听配置变更，重新获取数据
 */
watch(gender, async (newGender, oldGender) => {
  if (newGender !== oldGender) {
    await fetchWCInfo();
  }
})

onMounted(async () => {
  // 从 localStorage 加载配置
  if (process.browser) {
    gender.value = JSON.parse(localStorage.getItem('gender')) || gender.value;
  }
  await fetchWCInfo();
})

/**
 * 获取厕所状态信息
 * @returns {Promise<void>}
 */
async function fetchWCInfo() {
  wcInfo.value.wc = [];
  loading.value = true;
  finished.value = false;
  try {
    const {data} = await useFetch('/api/states?gender=' + gender.value);
    wcInfo.value = data.value;
  } catch (error) {
    console.log(error)
  } finally {
    loading.value = false;
    finished.value = true;
  }
}

const settingShow = ref(false)
function openSettings() {
  settingShow.value = true
}
function saveSettings() {
  localStorage.setItem('gender', JSON.stringify(gender.value));
}

const MALE_ICON = "/male.png";
const FEMALE_ICON = "/female.png";
const GENDER_ICON = "/favicon.ico"

</script>

<template>
  <div id="app">
    <van-nav-bar :title="wcInfo.name" class="wc-title">
      <template #right>
        <van-icon :name="GENDER_ICON" size="26" @click="openSettings"/>
      </template>
    </van-nav-bar>

    <van-list class="wc-list-container" v-model:loading="loading" :finished="finished" :disabled="true">
      <template v-for="wcFloorItem in wcInfo.wc">
        <van-row justify="center" gutter="20" >
          <van-col span="4">
            <van-cell :title="wcFloorItem.floor" title-style="font-size: large;font-style: italic;" class="floor"/>
          </van-col>
          <van-col span="20">
            <van-cell v-for="wcItem in wcFloorItem.list" :title="wcItem.location" :value="wcItem.capacity"
                      class="hidden-border-bottom" title-style="margin-left: 10px;">
              <template #icon>
                <van-icon :name="wcItem.gender === '男' ? MALE_ICON : FEMALE_ICON" size="20" style="margin-top: 2px"/>
              </template>
            </van-cell>
          </van-col>
        </van-row>
        <van-divider />
      </template>
    </van-list>

    <van-action-sheet v-model:show="settingShow" title="性别">
      <div class="setting">
        <van-checkbox-group v-model="gender" direction="horizontal" shape="square" @change="saveSettings">
          <van-checkbox name="女" icon-size="25">
            <img :src="FEMALE_ICON" style="height: 35px;" />
          </van-checkbox>
          <van-checkbox name="男" icon-size="25" style="margin-left: 80px;">
            <img :src="MALE_ICON" style="height: 35px;"/>
          </van-checkbox>
        </van-checkbox-group>
      </div>
    </van-action-sheet>

    <van-floating-bubble axis="xy" icon="replay" magnetic="x" @click="fetchWCInfo" />
  </div>

</template>

<style scoped>
#app {
  max-width: 500px;
  margin: 0 auto;
  border: 1px solid #3cb75c;
}


.wc-list-container {
  margin-top: 20px;
  padding: 0 20px;
}

.floor {
  --van-cell-horizontal-padding: 2px
}

.wc-title {
  --van-nav-bar-background: #3cb75c;
  --van-nav-bar-title-text-color: beige;
}

.setting {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 25px 25px 50px;
}

.hidden-border-bottom::after {
  border-bottom: none !important;
}
</style>
