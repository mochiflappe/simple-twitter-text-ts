import TwitterText from '../src/twitterText';

describe('TwitterText', () => {
    describe('Character Count', () => {
        it('empty should be zero length.', () => {
            expect(TwitterText.getTweetLength('')).toBe(0);
        });
        it('small tweet should be counted correctly.', () => {
            expect(TwitterText.getTweetLength('sample tweet')).toBe(12);
        });
        it('Should count short URLs as 23', () => {
            expect(TwitterText.getTweetLength('sample tweet with short url http://example.com/')).toBe(51);
        });
        it('Should count long URLs as 23', () => {
            expect(TwitterText.getTweetLength('sample tweet with short url http://example.com/example/example/example/')).toBe(51);
        });
        it('japanese tweet.', () => {
            expect(TwitterText.getTweetLength('こんにちは！')).toBe(12);
        });
        it('japanese tweet and URLs', () => {
            expect(TwitterText.getTweetLength('こんにちは！ http://example.com/')).toBe(36);
        });
    });
});
