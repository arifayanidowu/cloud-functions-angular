/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// TODO(DEVELOPER): Import the Cloud Functions for Firebase and the Firebase Admin modules here.
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp(functions.config().firebase);

// TODO(DEVELOPER): Write the addWelcomeMessages Function here.
exports.addWelcomeMessages = functions.auth.user().onCreate(user => {
  console.log(`A new User just signed in ${user.displayName}`);
  const fullname = user.displayName || "Anonymous";

  return admin
    .database()
    .ref("messages")
    .push({
      name: "Firebase Bot",
      photoUrl: "/assets/images/firebase-logo.png",
      text: `${fullname} signed in for the first time! welcome`
    });
});
// TODO(DEVELOPER): Write the blurOffensiveImages Function here.

// TODO(DEVELOPER): Write the sendNotifications Function here.
exports.sendNotifications = functions.database
  .ref("/messages/{messageId}")
  .onWrite(change => {
    if (change.before.val()) {
      return;
    }

    const original = change.after.val();
    const text = original.text;
    const payload = {
      notification: {
        title: `${original.name} posted ${text ? "a message" : "an Image"}`,
        body: text
          ? text.length <= 100
            ? text
            : text.substring(0, 97) + "..."
          : "",
        icon: original.photoUrl || "/assets/images/profile_placeholder.png"
      }
    };

    return admin
      .database()
      .ref("fcmTokens")
      .once("value")
      .then(allTokens => {
        if (allTokens.val()) {
          const tokens = Object.keys(allTokens.val());

          return admin
            .messaging()
            .sendToDevice(tokens, payload)
            .then(response => {
              const tokensToRemove = [];
              response.results.forEach((result, index) => {
                const error = result.error;
                if (error) {
                  console.error(
                    "Failure sending notifications to",
                    tokens[index],
                    error
                  );
                  if (
                    error.code === "messaging/invalid-registration-token" ||
                    error.code === "messaging/registration-token-not-registered"
                  ) {
                    tokensToRemove.push(
                      allTokens.ref.child(tokens[index]).remove()
                    );
                  }
                }
              });
              return Promise.all(tokensToRemove);
            });
        }
      });
  });
// (OPTIONAL) TODO(DEVELOPER): Write the annotateMessages Function here.
