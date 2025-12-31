import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <App />
)

const tooltipContainer = document.createElement('div')
tooltipContainer.id = 'tooltip-container'
tooltipContainer.style.cssText = 'position: fixed; top: 0; left: 0; z-index: 2147483647; pointer-events: none;'
document.body.appendChild(tooltipContainer)

let activeTooltip: HTMLElement | null = null
let tooltipTimeout: ReturnType<typeof setTimeout> | null = null

document.addEventListener('mouseenter', (e) => {
  const target = e.target
  if (!(target instanceof Element) || !target.hasAttribute('data-tooltip')) return

  const text = target.getAttribute('data-tooltip')
  if (!text) return

  tooltipTimeout = setTimeout(() => {
    const tooltip = document.createElement('div')
    tooltip.textContent = text || ''
    tooltip.style.cssText = `
      position: fixed;
      padding: 6px 10px;
      background: #333;
      color: white;
      font-size: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border-radius: 6px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
      z-index: 2147483647;
    `
    tooltipContainer.appendChild(tooltip)
    activeTooltip = tooltip

    const rect = target.getBoundingClientRect()
    const padding = 8

    let left = rect.left + rect.width / 2
    let top = rect.top - padding

    if (top < padding) {
      top = rect.bottom + padding
    }

    const tooltipRect = tooltip.getBoundingClientRect()

    if (left - tooltipRect.width / 2 < padding) {
      left = padding + tooltipRect.width / 2
    }
    if (left + tooltipRect.width / 2 > window.innerWidth - padding) {
      left = window.innerWidth - padding - tooltipRect.width / 2
    }

    tooltip.style.left = `${left}px`
    tooltip.style.top = `${top}px`
    tooltip.style.transform = 'translateX(-50%)'
    requestAnimationFrame(() => {
      tooltip.style.opacity = '1'
    })
  }, 500)
}, true)

document.addEventListener('mouseleave', (e) => {
  const target = e.target
  if (!(target instanceof Element) || !target.hasAttribute('data-tooltip')) return

  if (tooltipTimeout) {
    clearTimeout(tooltipTimeout)
    tooltipTimeout = null
  }

  if (activeTooltip) {
    activeTooltip.style.opacity = '0'
    setTimeout(() => {
      if (activeTooltip && activeTooltip.parentNode) {
        activeTooltip.parentNode.removeChild(activeTooltip)
      }
      activeTooltip = null
    }, 200)
  }
}, true)

document.addEventListener('click', () => {
  if (activeTooltip) {
    activeTooltip.style.opacity = '0'
    setTimeout(() => {
      if (activeTooltip && activeTooltip.parentNode) {
        activeTooltip.parentNode.removeChild(activeTooltip)
      }
      activeTooltip = null
    }, 200)
  }
}, true)
