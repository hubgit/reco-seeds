var SeedsController = function($scope, $http) {
    $scope.showGenre = function(genre) {
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

    $scope.showArtists = function(show) {
        $scope.episode = null;
        $scope.brand = null;
        $scope.artists = [];
        $scope.reco = '';
        $scope.loading = true;

        $http.get('http://www.bbc.co.uk/programmes/' + show.pid + '/episodes/player.json').success(function(data) {
            $scope.episode = data.episodes[0].programme;
            $scope.brand = $scope.episode.programme;

            $http.get('http://www.bbc.co.uk/programmes/' + $scope.episode.pid + '.json').success(function(data) {
                var version = data.programme.versions[0];

                $http.get('http://www.bbc.co.uk/programmes/' + version.pid + '.json').success(function(data) {
                    $scope.artists = data.version.segment_events.map(function(segment_event) {
                        var segment = segment_event.segment;

                        if (segment.primary_contributor) {
                            return segment.primary_contributor.name;
                        }

                        return segment.artist;
                    }).filter(function(name) {
                        return name;
                    }).map(function(name) {
                        $scope.reco += '&artist=' + encodeURIComponent(name);

                        var artist = { name: name, tags: [] };

                        $http.get('http://ws.audioscrobbler.com/2.0/?method=artist.gettoptags&api_key=ffae7cc247f46daec72f7b112ee4d353&format=json&artist=' + name).success(function(data) {
                            if (data.error) {
                                return;
                            }

                            artist.tags = data.toptags.tag;
                        });

                        return artist;
                    });

                    $scope.loading = false;
                });
            });
        });
    };
}