var app = angular.module('seeds', []);

app.filter('encodeURIComponent', function() {
    return window.encodeURIComponent;
});

app.controller('SeedsController', function ($scope, $http, $sce) {
    var reset = function() {
        $scope.episode = null;
        $scope.brand = null;
        $scope.player = null;
        $scope.tracks = [];
        $scope.reco = '';
    };

    $scope.showGenre = function(genre) {
        reset();

        $scope.activeGenre = genre;
        $scope.shows = null;

        var path = genre ? 'music/' + genre : 'music'

        $http.get('http://www.bbc.co.uk/programmes/genres/' + path + '/player.json').success(function(data) {
            $scope.shows = data.category_slice.programmes.filter(function(programme) {
                return programme.type === 'brand';
            });

            if (!genre) {
                $scope.genres = data.category_slice.category.narrower;
            }
        });
    };

    $scope.showGenre();

    $scope.showTracks = function(show) {
        reset();
        $scope.loading = true;

        $http.get('http://www.bbc.co.uk/programmes/' + show.pid + '/episodes/player.json').success(function(data) {
            $scope.episode = data.episodes[0].programme;
            $scope.brand = $scope.episode.programme;

            $http.get('http://www.bbc.co.uk/programmes/' + $scope.episode.pid + '.json').success(function(data) {
                var version = data.programme.versions[0];

                $http.get('http://www.bbc.co.uk/programmes/' + version.pid + '.json').success(function(data) {
                    $scope.tracks = data.version.segment_events.map(function(segment_event) {
                        var segment = segment_event.segment;

                        var track = {
                            name: segment.title,
                            tags: [],
                            artist: {
                                name: segment.artist,
                            },
                        }

                        if (segment.primary_contributor) {
                            track.artist.name = segment.primary_contributor.name;
                        }

                        return track;
                    }).filter(function(track) {
                        return track.name && track.artist.name;
                    }).map(function(track) {
                        $scope.reco += '&artist=' + encodeURIComponent(track.artist.name);

                        $http.get('http://ws.audioscrobbler.com/2.0/', {
                            params: {
                                method: 'track.gettoptags',
                                api_key: 'ffae7cc247f46daec72f7b112ee4d353',
                                format: 'json',
                                track: track.name,
                                artist: track.artist.name,
                            }
                        }).success(function(data) {
                            if (data.error) {
                                return;
                            }

                            track.tags = data.toptags.tag;
                        });

                        return track;
                    });

                    $scope.loading = false;

                    if ($scope.tracks.length) {
                        $scope.showPlayer();
                    }
                });
            });
        });
    };

    $scope.showPlayer = function() {
        var ids = [];

        var requests = $scope.tracks.map(function(track) {
            var query = { track: track.name, artist: track.artist.name };

            var request = $.spotify.search('track', query);

            request.progress(function(jqXHR, textStatus, item) {
                switch (textStatus) {
                    case 'start':
                        $scope.spotify = 'Looking up ' + track.artist.name + ' - ' + track.name;
                        break;

                    case 'rate-limit':
                        $scope.spotify = 'Rate-limited; waiting…';
                        break;

                    $scope.$apply();
                }
            });

            request.done(function(data) {
                if (data.tracks && data.tracks.length) {
                    var id = data.tracks[0].href.replace(/^spotify:track:/, '');
                    ids.push(id);
                }
            });

            return request;
        });

        var generateTrackset = function() {
            $scope.spotify = null;

            if (ids.length) {
                var url = 'https://embed.spotify.com/?uri=spotify:trackset:playlist:' + ids.join(',');

                $scope.player = $sce.trustAsResourceUrl(url);
                $scope.$apply();
            }
        };

        $.when.apply($, requests).then(generateTrackset, generateTrackset);
    };
});