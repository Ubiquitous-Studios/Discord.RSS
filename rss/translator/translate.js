const config = require('../../config.json')
const filterFeed = require('./filters.js')
const generateEmbed = require('./embed.js')
const Article = require('./article.js')
const getSubs = require('./subscriptions.js')

module.exports = function (guildId, rssList, rssName, rawArticle, isTestMessage) {
  // Just in case. If this happens, please report.
  if (!rssList[rssName]) { console.log(`RSS Error: Unable to translate a null source:\nguildId: ${guildId}\nrssName: ${rssName}\nrssList:`, rssList); return null }

  const article = new Article(rawArticle, guildId)
  article.subscriptions = getSubs(rssList, rssName, article)

  // Filter message
  let filterExists = false
  if (rssList[rssName].filters && typeof rssList[rssName].filters === 'object') {
    for (var prop in rssList[rssName].filters) {
      if (prop !== 'roleSubscriptions') filterExists = true // Check if any filter categories exists, excluding roleSubs as they are not filters
    }
  }

  const filterResults = filterExists ? filterFeed(rssList, rssName, article, isTestMessage) : false

  if (!isTestMessage && filterExists && !filterResults) return null // Feed article delivery only passes through if the filter found the specified content

  const finalMessageCombo = {}
  if (rssList[rssName].embedMessage && rssList[rssName].embedMessage.enabled !== false && rssList[rssName].embedMessage.properties) { // Check if embed is enabled
    finalMessageCombo.embedMsg = generateEmbed(rssList, rssName, article)
    finalMessageCombo.textMsg = (!rssList[rssName].message) ? article.convertKeywords(config.feedSettings.defaultMessage) : (rssList[rssName].message === '{empty}') ? '' : article.convertKeywords(rssList[rssName].message) // Allow empty messages if embed is enabled with {empty}
  } else finalMessageCombo.textMsg = (!rssList[rssName].message || rssList[rssName].message === '{empty}') ? article.convertKeywords(config.feedSettings.defaultMessage) : article.convertKeywords(rssList[rssName].message) // Do not allow empty messages with just text and no embed, thus will fallback to default mesage

  // Generate test details
  if (isTestMessage) {
    let testDetails = ''
    const footer = '\nBelow is the configured message to be sent for this feed:\n\n--'
    testDetails += `\`\`\`Markdown\n# BEGIN TEST DETAILS #\`\`\`\`\`\`Markdown\n\n[Title]: {title}\n${article.title}`

    if (article.summary && article.summary !== article.description) {  // Do not add summary if summary = description
      let testSummary
      if (article.description && article.description.length > 500) testSummary = (article.summary.length > 500) ? `${article.summary.slice(0, 490)} [...]\n\n**(Truncated summary for shorter rsstest)**` : article.summary // If description is long, truncate summary.
      else testSummary = article.summary
      testDetails += `\n\n[Summary]: {summary}\n${testSummary}`
    }

    if (article.description) {
      let testDescrip
      if (article.summary && article.summary.length > 500) testDescrip = (article.description.length > 500) ? `${article.description.slice(0, 490)} [...]\n\n**(Truncated description for shorter rsstest)**` : article.description // If summary is long, truncate description.
      else testDescrip = article.description
      testDetails += `\n\n[Description]: {description}\n${testDescrip}`
    }

    if (article.pubdate) testDetails += `\n\n[Published Date]: {date}\n${article.pubdate}`
    if (article.author) testDetails += `\n\n[Author]: {author}\n${article.author}`
    if (article.link) testDetails += `\n\n[Link]: {link}\n${article.link}`
    if (article.subscriptions) testDetails += `\n\n[Subscriptions]: {subscriptions}\n${article.subscriptions.split(' ').length - 1} subscriber(s)`
    if (article.images) testDetails += `\n\n${article.listImages()}`
    if (article.tags) testDetails += `\n\n[Tags]: {tags}\n${article.tags}`
    if (filterExists) testDetails += `\n\n[Passed Filters?]: ${(filterResults) ? 'Yes' : 'No'}${filterResults}`
    testDetails += '```' + footer

    finalMessageCombo.testDetails = testDetails
  }

  return finalMessageCombo
}
