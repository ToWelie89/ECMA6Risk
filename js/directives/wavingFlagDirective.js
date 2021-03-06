class WavingFlagDirective {
    constructor() {
        this.restrict = 'E';
        this.template = '<div id="wavingFlag" class="flag"></div>';
        this.scope = {
            flagUrl: '&flagUrl'
        };
    }

    link(scope, elem, attr) {
        var flagW = attr.flagWidth;
        var flagElementW = 2;
        var len = flagW/flagElementW;
        var delay = 6;
        var flag = elem[0].children[0];
        flag.style.width = attr.flagWidth + 'px';
        flag.style.height = attr.flagHeight + 'px';

        scope.$watch(scope.flagUrl, () => {
            const flagAttribute = scope.flagUrl();
            const flagUrl = (typeof flagAttribute === 'object') ? flagAttribute.path : flagAttribute;

            flag.querySelectorAll('.flag-element').forEach(x => {
                x.style.backgroundImage = `url(${flagUrl})`;
            });
        });

        const init = () => {
            for(var i = 0; i < len; i++){
                var fe = document.createElement('div');
                fe.className = 'flag-element';
                fe.style.backgroundPosition = -i*flagElementW+'px 0';
                fe.style.webkitAnimationDelay = i*delay+'ms';
                fe.style.animationDelay = i * delay + 'ms';

                const flagAttribute = scope.flagUrl();
                const flagUrl = (typeof flagAttribute === 'object') ? flagAttribute.path : flagAttribute;

                fe.style.backgroundImage = `url(${flagUrl})`;
                fe.style.backgroundSize = attr.flagWidth + 'px 100%';
                flag.append(fe);
            }
        };

        setTimeout(() => {
            init();
        }, 50);
    }
}

module.exports = WavingFlagDirective;