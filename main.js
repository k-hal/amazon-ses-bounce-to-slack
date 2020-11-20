console.log('Loading function');

const https = require('https');
const url = require('url');
const slack_url = process.env.SLACK_HOOKURL;
const slack_req_opts = url.parse(slack_url);
slack_req_opts.method = 'POST';
slack_req_opts.headers = {'Content-Type': 'application/json'};

exports.handler = function(event, context) {
  (event.Records || []).forEach(function (rec) {
    if (rec.Sns) {
      var req = https.request(slack_req_opts, function (res) {
        if (res.statusCode === 200) {
          context.succeed('posted to slack');
        } else {
          context.fail('status code: ' + res.statusCode);
        }
      });

      req.on('error', function(e) {
        console.log('problem with request: ' + e.message);
        context.fail(e.message);
      });

      var message = JSON.parse(rec.Sns.Message);
      var obj;

      if (rec.Sns.TopicArn === process.env.SNS_TOPIC_ARN) {
          if (message.notificationType === "Bounce") {
                var bouncedRecipients = [];
                var smtpStatusCodes = [];
                var diagnosticCodes = [];
                for(let key in message.bounce.bouncedRecipients) {
                  bouncedRecipients.push(message.bounce.bouncedRecipients[key].emailAddress);
                  smtpStatusCodes.push(message.bounce.bouncedRecipients[key].status);
                  diagnosticCodes.push(message.bounce.bouncedRecipients[key].diagnosticCode);
                }
                obj = {
                    username: "SES Notify",
                    attachments: [{
                        failback: rec.Sns,
                        pretext: "SES Notify",
                        color: "#E8E235",
                        fields: [{
                            title: "bounceType",
                            value: message.bounce.bounceType
                        }, {
                            title: "bounceSubType",
                            value: message.bounce.bounceSubType
                        }, {
                            title: "bouncedRecipients",
                            value: JSON.stringify(bouncedRecipients)
                        }, {
                            title: "smtpStatus",
                            value: JSON.stringify(smtpStatusCodes)
                        }, {
                            title: "diagnosticCode",
                            value: JSON.stringify(diagnosticCodes)
                        }, {
                            title: "From",
                            value: JSON.stringify(message.mail.commonHeaders.from)
                        }, {
                            title: "To",
                            value: JSON.stringify(message.mail.commonHeaders.to)
                        }, {
                            title: "CC",
                            value: JSON.stringify(message.mail.commonHeaders.cc)
                        }, {
                            title: "Date",
                            value: message.mail.commonHeaders.date
                        }, {
                            title: "Subject",
                            value: message.mail.commonHeaders.subject
                        }]
                    }]
                };
            req.write(JSON.stringify(obj));
          }
      }

      //req.write(JSON.stringify({text: JSON.stringify(rec.Sns.Message, null, '  ')})); // for testing: , channel: '@vadim'

      req.end();
    }
  });
};
