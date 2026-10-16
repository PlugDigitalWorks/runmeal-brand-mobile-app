import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { RECAPTCHA_SITE_KEY } from '@/config';
import { colors, radius } from '@/theme';

type Props = {
  /** The cafe's web host; the page claims it so the site key's domain allowlist and the API's hostname check both pass. */
  host: string;
  onToken: (token: string) => void;
  onExpired: () => void;
};

/** brandfe's explicit reCAPTCHA v2 widget, rendered in a WebView that looks like the cafe's own page. */
export function Recaptcha({ host, onToken, onExpired }: Props) {
  const html = useMemo(
    () => `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;background:transparent;display:flex;justify-content:center;align-items:center;height:100%}</style>
<script>
function send(m){window.ReactNativeWebView.postMessage(JSON.stringify(m));}
function boot(){grecaptcha.render('box',{sitekey:${JSON.stringify(RECAPTCHA_SITE_KEY)},
callback:function(t){send({type:'token',token:t});},
'expired-callback':function(){send({type:'expired'});}});}
</script>
<script src="https://www.google.com/recaptcha/api.js?onload=boot&render=explicit" async defer></script>
</head><body><div id="box"></div></body></html>`,
    [],
  );

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type: string; token?: string };
      if (message.type === 'token' && message.token) onToken(message.token);
      if (message.type === 'expired') onExpired();
    } catch {
      // Not ours.
    }
  };

  return (
    <View style={styles.frame}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: `https://${host}/` }}
        onMessage={onMessage}
        javaScriptEnabled
        scrollEnabled={false}
        style={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 500, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.card },
  web: { backgroundColor: 'transparent' },
});
