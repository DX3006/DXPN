![logo]( images/readme/DXPN_ReadMe.png ) 

# DXPoints Notification

> This is a simple overlay that shows notifications for Twitch channel points rewards.
> 
> It will automatically receive any rewards name, image and color, and display a notification when it's redeemed on your livestream.
>
> **UPDATED MAY 2025**: Now uses Twitch EventSub WebSocket API (replacing the deprecated PubSub system)

## What's New in Version 2.1.1

- **Support for browser audio playback policies**: The tool now automatically manages browser audio playback restrictions.
- **Audio enablement message**: A message will be displayed asking the user to interact with the page to enable sound.
- **Automatic silent mode**: If there is no interaction, notifications will be displayed without sound.


 
# How to use
> 1. Log into [this page](https://dx3006.github.io/DXPN/) with your twitch account.
> 
> 2. After Logging in you will be redirected to a **blank screen**, this means that login was successful.
> 
> 3. Buy something with the channel point to view the notification animation.
> 
>    ![animation]( images/readme/animation_preview.png ) 
>
> 4. Take the **url** of this page and put it in a browser source in **OBS/StreamLabs**.

## Testing locally

If you want to test or develop this tool locally:

1. Start a local web server in the project folder:
   ```bash
   python -m http.server 8000
   ```

2. Access the tool with debug mode enabled:
   ```
   http://localhost:8000/?debug=true
   ```

## Notes

- Remember to configure the Twitch ClientID if you're using your own Twitch application.
- For notification sounds to work, the user must interact with the page at least once (click, touch, or key press).


# Features

### Current Features
- ✅ Reward notification system
- ✅ Anti-spam system for rewards
- ✅ Dynamic color, image and name for rewards
- ✅ Sound effect for notification
- ✅ Support for browser audio playback policies
- ✅ Automatic adaptation to Twitch EventSub API

### Planned Features
- ⬜ Settings screen to accommodate the options
- ⬜ Add a custom sound effect to notification
- ⬜ Option to override the default color by placing a single color for all rewards
- ⬜ Option to block notification of specific rewards
- ⬜ TTS (text to speech) reward
- ⬜ Have a reward that lets your viewers play sound effects on your livestream

# Contributions

Thanks to [Lunakchay](https://www.twitch.tv/lunakchay) for translating the tool to Spanish.

If you would like to contribute and accelerate the development of this tool, consider making a donation:

[![Paypal](images/readme/paypal_button.png)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=7G2SFFMS46ZZ8)

