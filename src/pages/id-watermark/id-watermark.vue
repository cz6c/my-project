<script lang="ts" setup>
import type { ComponentPublicInstance } from 'vue'
import { getCurrentInstance, nextTick, ref, watch } from 'vue'

defineOptions({ name: 'IdWatermark' })

/** 小程序端 canvas API 需传入页面/组件实例 */
const canvasHost = getCurrentInstance()?.proxy as ComponentPublicInstance | undefined

definePage({
  style: {
    navigationBarTitleText: '证件照片加水印',
    navigationBarBackgroundColor: '#4285f4',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f5f5f5',
  },
})

const canvasId = 'idWatermarkCanvas'

/** uni-app / 小程序 input */
interface UniInputEvent {
  detail?: { value?: string }
}

interface UniSliderEvent {
  detail?: { value?: number }
}

const imagePath = ref('')
const imgW = ref(0)
const imgH = ref(0)

const watermarkText = ref('仅用于办理 XXX 使用')

type WatermarkColor = '#ffffff' | '#000000' | '#E53935'
const color = ref<WatermarkColor>('#000000')
const colors: { value: WatermarkColor, label: string }[] = [
  { value: '#ffffff', label: '白' },
  { value: '#000000', label: '黑' },
  { value: '#E53935', label: '红' },
]

/** 逆时针角度（与常见斜向水印一致） */
const anglePresets = [
  { deg: -30, title: '较缓' },
  { deg: -45, title: '常用' },
  { deg: -60, title: '较陡' },
] as const
const angleDeg = ref<-30 | -45 | -60>(-45)

const opacity = ref(20)
const spacing = ref(59)
const fontSize = ref(20)

const canvasStyle = ref<{ width: string, height: string }>({ width: '100%', height: '200px' })
const canvasW = ref(300)
const canvasH = ref(300)

const saving = ref(false)

let drawTimer: ReturnType<typeof setTimeout> | null = null

function scheduleDraw() {
  if (!imagePath.value)
    return
  if (drawTimer)
    clearTimeout(drawTimer)
  drawTimer = setTimeout(() => {
    drawTimer = null
    drawCanvas()
  }, 48)
}

watch(
  [watermarkText, color, opacity, spacing, fontSize, angleDeg],
  () => scheduleDraw(),
)

function onTextInput(e: UniInputEvent) {
  watermarkText.value = String(e.detail?.value ?? '')
}

function onOpacityChange(e: UniSliderEvent) {
  opacity.value = Number(e.detail?.value ?? opacity.value)
  scheduleDraw()
}

function onSpacingChange(e: UniSliderEvent) {
  spacing.value = Number(e.detail?.value ?? spacing.value)
  scheduleDraw()
}

function onFontSizeChange(e: UniSliderEvent) {
  fontSize.value = Number(e.detail?.value ?? fontSize.value)
  scheduleDraw()
}

function choosePhoto() {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const path = res.tempFilePaths[0]
      if (!path)
        return
      uni.getImageInfo({
        src: path,
        success: (info) => {
          imagePath.value = path
          imgW.value = info.width
          imgH.value = info.height
          nextTick(() => measureAndDraw())
        },
        fail: () => {
          uni.showToast({ title: '无法读取图片', icon: 'none' })
        },
      })
    },
  })
}

function measureAndDraw() {
  if (!imagePath.value || !imgW.value || !imgH.value)
    return
  const query = uni.createSelectorQuery()
  query
    .select('.preview-canvas-wrap')
    .boundingClientRect((rect) => {
      if (!rect || !('width' in rect) || rect.width <= 0)
        return
      const maxW = rect.width
      const ratio = imgH.value / imgW.value
      const w = maxW
      const h = maxW * ratio
      canvasW.value = w
      canvasH.value = h
      canvasStyle.value = { width: `${w}px`, height: `${h}px` }
      nextTick(() => drawCanvas())
    })
    .exec()
}

function drawCanvas() {
  if (!imagePath.value || !imgW.value || !imgH.value)
    return

  const ctx = uni.createCanvasContext(canvasId, canvasHost)
  const cw = canvasW.value
  const ch = canvasH.value
  const iw = imgW.value
  const ih = imgH.value

  const scale = Math.min(cw / iw, ch / ih)
  const dw = iw * scale
  const dh = ih * scale
  const ox = (cw - dw) / 2
  const oy = (ch - dh) / 2

  ctx.clearRect(0, 0, cw, ch)
  ctx.drawImage(imagePath.value, ox, oy, dw, dh)

  const text = (watermarkText.value || ' ').trim() || ' '
  const fs = Math.max(8, fontSize.value)
  const space = Math.max(4, spacing.value)

  ctx.save()
  ctx.setGlobalAlpha(Math.min(1, Math.max(0.05, opacity.value / 100)))
  ctx.setFillStyle(color.value)
  ctx.setFontSize(fs)

  const deg = angleDeg.value
  const rad = (deg * Math.PI) / 180
  ctx.translate(cw / 2, ch / 2)
  ctx.rotate(rad)

  let tw = fs * text.length * 0.65
  try {
    const m = ctx.measureText?.(text)
    if (m && typeof m.width === 'number' && m.width > 0)
      tw = m.width + space
  }
  catch {
    tw = fs * text.length * 0.65 + space
  }
  const th = fs + space * 0.45

  const R = Math.sqrt(cw * cw + ch * ch)
  for (let x = -R; x < R; x += tw) {
    for (let y = -R; y < R; y += th)
      ctx.fillText(text, x, y)
  }

  ctx.restore()
  ctx.draw()
}

function saveWatermarked() {
  if (!imagePath.value) {
    uni.showToast({ title: '请先选择照片', icon: 'none' })
    return
  }
  if (saving.value)
    return

  saving.value = true

  nextTick(() => {
    uni.canvasToTempFilePath(
      {
        canvasId,
        width: canvasW.value,
        height: canvasH.value,
        destWidth: canvasW.value,
        destHeight: canvasH.value,
        fileType: 'png',
        quality: 1,
        success: (res) => {
          const tempPath = res.tempFilePath
          uni.saveImageToPhotosAlbum({
            filePath: tempPath,
            success: () => {
              uni.showToast({ title: '已保存到相册' })
            },
            fail: (err) => {
              const msg = String(err.errMsg ?? '')
              if (msg.includes('auth deny') || msg.includes('authorize')) {
                uni.showModal({
                  title: '需要相册权限',
                  content: '请在设置中允许保存到相册后重试',
                  confirmText: '去设置',
                  success: (m) => {
                    if (m.confirm)
                      uni.openSetting()
                  },
                })
              }
              else {
                uni.showToast({ title: '保存失败', icon: 'none' })
              }
            },
            complete: () => {
              saving.value = false
            },
          })
        },
        fail: () => {
          uni.showToast({ title: '导出失败', icon: 'none' })
          saving.value = false
        },
      },
      canvasHost,
    )
  })
}
</script>

<template>
  <view class="page pb-safe">
    <view class="notice">
      <text class="notice-icon">🔔</text>
      <text class="notice-text">小程序不会存储您的原始照片及加了水印后的照片，请放心使用！</text>
    </view>

    <view class="preview-outer">
      <view class="preview-canvas-wrap checkerboard">
        <canvas
          :id="canvasId"
          :canvas-id="canvasId"
          class="preview-canvas"
          :style="canvasStyle"
        />
        <view v-if="!imagePath" class="empty-hint">
          <text>请先选择证件照片</text>
        </view>
      </view>
    </view>

    <view class="panel">
      <view class="row">
        <text class="label">文字</text>
        <input
          class="field"
          type="text"
          :value="watermarkText"
          placeholder="输入水印内容"
          @input="onTextInput"
        >
      </view>

      <view class="row row-top">
        <text class="label">颜色</text>
        <view class="color-row">
          <view
            v-for="c in colors"
            :key="c.value"
            class="color-opt"
            @click="color = c.value; scheduleDraw()"
          >
            <view
              class="color-dot"
              :class="{ ring: color === c.value }"
              :style="{ backgroundColor: c.value, borderColor: c.value === '#ffffff' ? '#ddd' : c.value }"
            />
            <view v-if="color === c.value" class="check text-primary">
              ✓
            </view>
          </view>
        </view>
      </view>

      <view class="row row-slider">
        <text class="label">透明度</text>
        <slider
          class="slider"
          :value="opacity"
          :min="8"
          :max="100"
          :step="1"
          show-value
          active-color="#4285f4"
          :block-size="20"
          @changing="onOpacityChange"
          @change="onOpacityChange"
        />
      </view>

      <view class="row row-top">
        <text class="label">角度</text>
        <view class="angle-row">
          <view
            v-for="a in anglePresets"
            :key="a.deg"
            class="angle-opt"
            @click="angleDeg = a.deg; scheduleDraw()"
          >
            <view class="angle-icon" :class="[`tilt-${Math.abs(a.deg)}`, { on: angleDeg === a.deg }]">
              <view class="angle-line" />
            </view>
            <view v-if="angleDeg === a.deg" class="check text-primary">
              ✓
            </view>
          </view>
        </view>
      </view>

      <view class="row row-slider">
        <text class="label">间距</text>
        <slider
          class="slider"
          :value="spacing"
          :min="24"
          :max="120"
          :step="1"
          show-value
          active-color="#4285f4"
          :block-size="20"
          @changing="onSpacingChange"
          @change="onSpacingChange"
        />
      </view>

      <view class="row row-slider">
        <text class="label">字体大小</text>
        <slider
          class="slider"
          :value="fontSize"
          :min="12"
          :max="56"
          :step="1"
          show-value
          active-color="#4285f4"
          :block-size="20"
          @changing="onFontSizeChange"
          @change="onFontSizeChange"
        />
      </view>
    </view>

    <view class="actions">
      <button class="btn btn-outline" type="default" @click="choosePhoto">
        选择照片
      </button>
      <button
        class="btn btn-primary"
        type="primary"
        :loading="saving"
        :disabled="saving"
        @click="saveWatermarked"
      >
        保存水印照片
      </button>
    </view>
  </view>
</template>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 24px;
}

.notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: #fff9e6;
  color: #8a6914;
  font-size: 13px;
  line-height: 1.45;
}

.notice-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.notice-text {
  flex: 1;
}

.preview-outer {
  padding: 12px 16px 0;
}

.preview-canvas-wrap {
  position: relative;
  width: 100%;
  min-height: 180px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkerboard {
  background-color: #e8e8e8;
  background-image:
    linear-gradient(45deg, #f0f0f0 25%, transparent 25%), linear-gradient(-45deg, #f0f0f0 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #f0f0f0 75%), linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
  background-size: 16px 16px;
  background-position:
    0 0,
    0 8px,
    8px -8px,
    -8px 0;
}

.preview-canvas {
  display: block;
  max-width: 100%;
}

.empty-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  color: #999;
  font-size: 14px;
}

.panel {
  margin: 16px;
  padding: 16px 14px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.row {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.row-top {
  align-items: flex-start;
}

.row-slider {
  align-items: center;
}

.row:last-child {
  margin-bottom: 0;
}

.label {
  width: 72px;
  flex-shrink: 0;
  font-size: 14px;
  color: #333;
}

.field {
  flex: 1;
  height: 36px;
  padding: 0 10px;
  font-size: 14px;
  background: #f7f7f7;
  border-radius: 6px;
}

.color-row,
.angle-row {
  flex: 1;
  display: flex;
  gap: 28px;
  align-items: flex-start;
}

.color-opt,
.angle-opt {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.color-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid transparent;
}

.color-dot.ring {
  box-shadow: 0 0 0 2px var(--wot-primary-6, #4285f4);
}

.angle-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.angle-icon.on {
  border-color: var(--wot-primary-6, #4285f4);
  box-shadow: 0 0 0 1px var(--wot-primary-6, #4285f4);
}

.angle-line {
  width: 22px;
  height: 3px;
  background: #555;
  border-radius: 1px;
}

.tilt-30 .angle-line {
  transform: rotate(-30deg);
}

.tilt-45 .angle-line {
  transform: rotate(-45deg);
}

.tilt-60 .angle-line {
  transform: rotate(-60deg);
}

.check {
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
}

.slider {
  flex: 1;
  margin-right: 0;
}

.actions {
  display: flex;
  gap: 12px;
  padding: 8px 16px 0;
}

.btn {
  flex: 1;
  font-size: 15px;
  border-radius: 10px;
  line-height: 44px;
  border: none;
}

.btn-outline {
  background: #fff !important;
  color: var(--wot-primary-6, #4285f4) !important;
  border: 1px solid var(--wot-primary-6, #4285f4) !important;
}

.btn-primary {
  background: var(--wot-primary-6, #4285f4) !important;
  color: #fff !important;
}
</style>
