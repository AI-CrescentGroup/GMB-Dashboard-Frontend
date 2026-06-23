'use server'

import PptxGenJS from 'pptxgenjs'

interface PlatformData {
  impressions: string
  clicks: string
  ctr: string
  spent: string
  cpm?: string
  cpc?: string
}

interface ConversionData {
  directions: string
  visits: string
  events: string
}

interface ExportData {
  dealerName: string
  dateRange: string
  google: PlatformData
  facebook: PlatformData
  instagram: PlatformData
  conversions: ConversionData
}

export async function exportDealerPPT(data: ExportData) {
  const prs = new PptxGenJS()

  // Slide dimensions
  prs.defineLayout({ name: 'LAYOUT1', width: 10, height: 7.5 })
  prs.defineLayout({ name: 'LAYOUT2', width: 10, height: 7.5 })

  const darkBlue = '#1e3a5f'
  const orange = '#e07856'
  const white = '#ffffff'
  const lightGray = '#f3f4f6'
  const darkGray = '#111827'

  // Slide 1: Cover
  const slide1 = prs.addSlide()
  slide1.background = { color: darkBlue }

  slide1.addText('GMB Marketing Dashboard', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 1,
    fontSize: 44,
    bold: true,
    color: white,
    align: 'center',
  })

  slide1.addText(data.dealerName, {
    x: 0.5,
    y: 3,
    w: 9,
    h: 1.2,
    fontSize: 40,
    bold: true,
    color: orange,
    align: 'center',
  })

  slide1.addText(data.dateRange, {
    x: 0.5,
    y: 4.2,
    w: 9,
    h: 0.6,
    fontSize: 20,
    color: white,
    align: 'center',
  })

  slide1.addText('Powered by Crescent Group', {
    x: 0.5,
    y: 6.8,
    w: 9,
    h: 0.4,
    fontSize: 12,
    color: white,
    align: 'center',
  })

  slide1.addText(`Generated: ${new Date().toLocaleDateString('en-IN')}`, {
    x: 8,
    y: 6.8,
    w: 1.5,
    h: 0.4,
    fontSize: 10,
    color: white,
    align: 'right',
  })

  // Helper function to add platform slide
  const addPlatformSlide = (title: string, platformData: PlatformData) => {
    const slide = prs.addSlide()
    slide.background = { color: white }

    slide.addText(title, {
      x: 0.5,
      y: 0.5,
      w: 9,
      h: 0.6,
      fontSize: 32,
      bold: true,
      color: darkBlue,
    })

    // 2x2 grid of metrics
    const metrics = [
      { label: 'Impressions', value: platformData.impressions },
      { label: 'Clicks', value: platformData.clicks },
      { label: 'Avg CTR', value: `${platformData.ctr}%` },
      { label: platformData.cpc ? 'Avg CPC' : 'Avg CPM', value: platformData.cpc ? `₹${platformData.cpc}` : `₹${platformData.cpm}` },
    ]

    const boxWidth = 4
    const boxHeight = 1.5
    const startX = 0.75
    const startY = 1.5
    const gapX = 0.5
    const gapY = 0.5

    metrics.forEach((metric, idx) => {
      const row = Math.floor(idx / 2)
      const col = idx % 2
      const x = startX + col * (boxWidth + gapX)
      const y = startY + row * (boxHeight + gapY)

      slide.addShape(prs.ShapeType.rect, {
        x,
        y,
        w: boxWidth,
        h: boxHeight,
        fill: { color: lightGray },
        line: { color: '#e5e7eb', width: 1 },
      })

      slide.addText(metric.label, {
        x,
        y: y + 0.2,
        w: boxWidth,
        h: 0.4,
        fontSize: 12,
        color: darkGray,
        align: 'center',
      })

      slide.addText(String(metric.value), {
        x,
        y: y + 0.6,
        w: boxWidth,
        h: 0.7,
        fontSize: 24,
        bold: true,
        color: orange,
        align: 'center',
      })
    })

    // Spent metric below
    slide.addText('Spent', {
      x: 0.75,
      y: 5.5,
      w: 8.5,
      h: 0.4,
      fontSize: 14,
      color: darkGray,
    })

    slide.addText(String(platformData.spent), {
      x: 0.75,
      y: 5.95,
      w: 8.5,
      h: 0.8,
      fontSize: 32,
      bold: true,
      color: orange,
    })
  }

  // Slide 2: Google
  addPlatformSlide('Google Ads Performance', data.google)

  // Slide 3: Facebook
  addPlatformSlide('Facebook Performance', data.facebook)

  // Slide 4: Instagram
  addPlatformSlide('Instagram Performance', data.instagram)

  // Slide 5: Conversions
  const slide5 = prs.addSlide()
  slide5.background = { color: white }

  slide5.addText('Conversion Metrics', {
    x: 0.5,
    y: 0.5,
    w: 9,
    h: 0.6,
    fontSize: 32,
    bold: true,
    color: darkBlue,
  })

  // 3 metric boxes
  const conversionMetrics = [
    { label: 'Driving Directions', value: data.conversions.directions },
    { label: 'Website Visits', value: data.conversions.visits },
    { label: 'Event Count', value: data.conversions.events },
  ]

  const convBoxWidth = 2.8
  const convBoxHeight = 2
  const convStartX = 1.5
  const convStartY = 1.8

  conversionMetrics.forEach((metric, idx) => {
    const x = convStartX + idx * (convBoxWidth + 0.6)

    slide5.addShape(prs.ShapeType.rect, {
      x,
      y: convStartY,
      w: convBoxWidth,
      h: convBoxHeight,
      fill: { color: lightGray },
      line: { color: '#e5e7eb', width: 1 },
    })

    slide5.addText(metric.label, {
      x,
      y: convStartY + 0.3,
      w: convBoxWidth,
      h: 0.5,
      fontSize: 12,
      color: darkGray,
      align: 'center',
    })

    slide5.addText(String(metric.value), {
      x,
      y: convStartY + 0.85,
      w: convBoxWidth,
      h: 0.8,
      fontSize: 28,
      bold: true,
      color: orange,
      align: 'center',
    })
  })

  // Generate file buffer
  const buffer = await prs.write({})
  return {
    buffer: Buffer.from(buffer).toString('base64'),
    fileName: `${data.dealerName}_GMB_Report_${new Date().toISOString().split('T')[0]}.pptx`,
  }
}
