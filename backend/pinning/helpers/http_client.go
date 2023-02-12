package helpers

import (
	"crypto/tls"
	"net/http"
	"net/url"
	"strconv"
)

func HttpProxyClient(proxyProtocol string, proxyHost string,
	proxyPort int) (*http.Client, error) {
	proxyUrl, _ := url.Parse(proxyProtocol +
		"://" + proxyHost + ":" + strconv.Itoa(proxyPort))
	tr := &http.Transport{
		Proxy: http.ProxyURL(proxyUrl),
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}
	client := &http.Client{Transport: tr}

	return client, nil
}

func HttpClient() (*http.Client, error) {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: true,
		},
	}
	client := &http.Client{Transport: tr}

	return client, nil
}
