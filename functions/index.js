const functions = require("firebase-functions")
const cheerio = require('cheerio')
const axios = require('axios')
const admin = require('firebase-admin');
admin.initializeApp()

const LINE_MESSAGING_API = "https://api.line.me/v2/bot"
const LINE_HEADER = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer YOUR-CHANNEL-ACCESS-TOKEN'
}

exports.gold = functions.pubsub.schedule('0 */1 * * *').timeZone('Asia/Bangkok').onRun(async context => {
  const response = await axios.get('https://goldtraders.or.th')
  const html = response.data;
  const $ = cheerio.load(html);

  const selector = $("#DetailPlace_uc_goldprices1_GoldPricesUpdatePanel font[color]")
  if (selector.length !== 4) {
    return null
  }

  let priceCurrent = ""
  selector.each((index, element) => {
    if (index === 0) {
      priceCurrent = $(element).text()
    } else {
      priceCurrent = priceCurrent.concat("|", $(element).text())
    }
  })

  let priceLast = await admin.firestore().doc('line/gold').get()
  if (!priceLast.exists || priceLast.data().price !== priceCurrent) {
    await admin.firestore().doc('line/gold').set({ price: priceCurrent })
    broadcast(priceCurrent)
  }

  return null
})

const broadcast = (priceCurrent) => {
  const prices = priceCurrent.split('|');
  return axios({
    method: 'post',
    url: `${LINE_MESSAGING_API}/message/push`,
    headers: LINE_HEADER,
    data: JSON.stringify({
      to: "U3c28a70ed7c5e7ce2c9a75976328c426",
      messages: [{
        "type": "flex",
        "altText": "Flex Message",
        "contents": {
          "type": "bubble",
          "size": "giga",
          "body": {
            "type": "box",
            "layout": "vertical",
            "paddingAll": "8%",
            "backgroundColor": "#FFF9E2",
            "contents": [
              {
                "type": "text",
                "text": "ราคาทองคำ",
                "weight": "bold",
                "size": "xl",
                "align": "center"
              },
              {
                "type": "box",
                "layout": "vertical",
                "margin": "xxl",
                "spacing": "sm",
                "contents": [
                  {
                    "type": "box",
                    "layout": "baseline",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "text",
                        "text": "ราคารับซื้อ",
                        "wrap": true,
                        "color": "#E2C05B",
                        "flex": 5,
                        "align": "end"
                      },
                      {
                        "type": "text",
                        "text": "ราคาขาย",
                        "flex": 2,
                        "color": "#E2C05B",
                        "align": "end"
                      }
                    ]
                  },
                  {
                    "type": "box",
                    "layout": "baseline",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "text",
                        "text": "ทองคำแท่ง",
                        "flex": 3
                      },
                      {
                        "type": "text",
                        "text": prices[0],
                        "wrap": true,
                        "size": "sm",
                        "flex": 2,
                        "align": "end"
                      },
                      {
                        "type": "text",
                        "text": prices[1],
                        "flex": 2,
                        "size": "sm",
                        "align": "end"
                      }
                    ]
                  },
                  {
                    "type": "separator"
                  },
                  {
                    "type": "box",
                    "layout": "baseline",
                    "spacing": "sm",
                    "contents": [
                      {
                        "type": "text",
                        "text": "ทองรูปพรรณ",
                        "flex": 3
                      },
                      {
                        "type": "text",
                        "text": prices[2],
                        "wrap": true,
                        "size": "sm",
                        "flex": 2,
                        "align": "end"
                      },
                      {
                        "type": "text",
                        "text": prices[3],
                        "flex": 2,
                        "size": "sm",
                        "align": "end"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        }
      }]
    })
  })
}