module github.com/shank318/coasterai

go 1.24.0

require (
	connectrpc.com/connect v1.14.0
	github.com/KimMachineGun/automemlimit v0.6.0
	//github.com/VapiAI/server-sdk-go v0.4.0
	github.com/coreos/go-oidc/v3 v3.13.0
	github.com/dgrijalva/jwt-go v3.2.0+incompatible
	github.com/drone/envsubst v1.0.3
	github.com/go-redis/redis v6.15.9+incompatible
	github.com/golang-migrate/migrate v3.5.4+incompatible
	github.com/golang-migrate/migrate/v4 v4.17.0
	github.com/google/uuid v1.6.0
	github.com/iancoleman/strcase v0.3.0
	github.com/jmoiron/sqlx v1.4.0
	github.com/k3a/html2text v1.2.1
	github.com/lib/pq v1.10.9
	github.com/nyaruka/phonenumbers v1.5.0
	github.com/pkg/errors v0.9.1
	github.com/rs/cors v1.10.1
	github.com/someone1/gcp-jwt-go v2.0.1+incompatible
	github.com/spf13/cobra v1.8.0
	github.com/spf13/pflag v1.0.10
	github.com/spf13/viper v1.18.2
	github.com/streamingfast/cli v0.0.4-0.20231213015719-421ef5a6f4bd
	github.com/streamingfast/derr v0.0.0-20230515163924-8570aaa43fe1
	github.com/streamingfast/dgrpc v0.0.0-20240423143010-f36784700c9a
	github.com/streamingfast/dmetrics v0.0.0-20240214191810-524a5c58fbaa
	github.com/streamingfast/logging v0.0.0-20230608130331-f22c91403091
	github.com/streamingfast/shutter v1.5.0
	github.com/stretchr/testify v1.11.1
	github.com/tidwall/gjson v1.18.0
	github.com/uptrace/opentelemetry-go-extra/otelsqlx v0.3.2
	go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc v0.58.0
	go.opentelemetry.io/otel v1.34.0
	go.uber.org/dig v1.18.0
	go.uber.org/multierr v1.11.0
	go.uber.org/zap v1.26.0
	golang.org/x/exp v0.0.0-20240719175910-8a7402abbf56
	golang.org/x/oauth2 v0.28.0
	golang.org/x/time v0.9.0 // indirect
	google.golang.org/grpc v1.70.0
	google.golang.org/protobuf v1.36.4
)

//replace github.com/tmc/langchaingo => github.com/streamingfast/langchaingo v0.1.9-0.20241203182852-7b3db2b92bc1

//replace github.com/VapiAI/server-sdk-go => github.com/shank318/server-sdk-go v0.0.1

require (
	github.com/imagekit-developer/imagekit-go/v2 v2.2.0
	github.com/streamingfast/dstore v0.1.2
)

require (
	cel.dev/expr v0.19.0 // indirect
	cloud.google.com/go v0.118.1 // indirect
	cloud.google.com/go/auth v0.14.0 // indirect
	cloud.google.com/go/auth/oauth2adapt v0.2.7 // indirect
	cloud.google.com/go/iam v1.3.1 // indirect
	cloud.google.com/go/monitoring v1.23.0 // indirect
	cloud.google.com/go/storage v1.50.0 // indirect
	connectrpc.com/grpchealth v1.3.0 // indirect
	connectrpc.com/grpcreflect v1.2.0 // indirect
	connectrpc.com/otelconnect v0.7.0 // indirect
	contrib.go.opencensus.io/exporter/stackdriver v0.13.10 // indirect
	contrib.go.opencensus.io/exporter/zipkin v0.1.1 // indirect
	dario.cat/mergo v1.0.1 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/azcore v1.20.0 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/azidentity v1.13.1 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/internal v1.11.2 // indirect
	github.com/Azure/azure-sdk-for-go/sdk/storage/azblob v1.6.3 // indirect
	github.com/AzureAD/microsoft-authentication-library-for-go v1.6.0 // indirect
	github.com/GoogleCloudPlatform/opentelemetry-operations-go/exporter/metric v0.49.0 // indirect
	github.com/Masterminds/goutils v1.1.1 // indirect
	github.com/Masterminds/semver/v3 v3.3.0 // indirect
	github.com/Masterminds/sprig/v3 v3.3.0 // indirect
	github.com/abice/go-enum v0.9.2 // indirect
	github.com/aws/aws-sdk-go v1.49.6 // indirect
	github.com/aws/aws-sdk-go-v2 v1.32.6 // indirect
	github.com/aws/aws-sdk-go-v2/aws/protocol/eventstream v1.6.7 // indirect
	github.com/aws/aws-sdk-go-v2/config v1.28.6 // indirect
	github.com/aws/aws-sdk-go-v2/credentials v1.17.47 // indirect
	github.com/aws/aws-sdk-go-v2/feature/ec2/imds v1.16.21 // indirect
	github.com/aws/aws-sdk-go-v2/feature/s3/manager v1.17.43 // indirect
	github.com/aws/aws-sdk-go-v2/internal/configsources v1.3.25 // indirect
	github.com/aws/aws-sdk-go-v2/internal/endpoints/v2 v2.6.25 // indirect
	github.com/aws/aws-sdk-go-v2/internal/ini v1.8.1 // indirect
	github.com/aws/aws-sdk-go-v2/internal/v4a v1.3.25 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/accept-encoding v1.12.1 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/checksum v1.4.6 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/presigned-url v1.12.6 // indirect
	github.com/aws/aws-sdk-go-v2/service/internal/s3shared v1.18.6 // indirect
	github.com/aws/aws-sdk-go-v2/service/s3 v1.71.0 // indirect
	github.com/aws/aws-sdk-go-v2/service/sso v1.24.7 // indirect
	github.com/aws/aws-sdk-go-v2/service/ssooidc v1.28.6 // indirect
	github.com/aws/aws-sdk-go-v2/service/sts v1.33.2 // indirect
	github.com/aws/smithy-go v1.22.1 // indirect
	github.com/census-instrumentation/opencensus-proto v0.4.1 // indirect
	github.com/cilium/ebpf v0.9.1 // indirect
	github.com/cncf/xds/go v0.0.0-20240905190251-b4127c9b8d78 // indirect
	github.com/containerd/cgroups/v3 v3.0.1 // indirect
	github.com/coreos/go-systemd/v22 v22.3.2 // indirect
	github.com/cpuguy83/go-md2man/v2 v2.0.7 // indirect
	github.com/distribution/reference v0.6.0 // indirect
	github.com/docker/docker v26.1.5+incompatible // indirect
	github.com/docker/go-units v0.5.0 // indirect
	github.com/envoyproxy/go-control-plane v0.13.1 // indirect
	github.com/envoyproxy/protoc-gen-validate v1.2.1 // indirect
	github.com/felixge/httpsnoop v1.0.4 // indirect
	github.com/go-jose/go-jose/v4 v4.0.5 // indirect
	github.com/godbus/dbus/v5 v5.0.4 // indirect
	github.com/golang-jwt/jwt/v5 v5.3.0 // indirect
	github.com/golang/mock v1.6.0 // indirect
	github.com/grpc-ecosystem/go-grpc-prometheus v1.2.0 // indirect
	github.com/huandu/xstrings v1.5.0 // indirect
	github.com/jmespath/go-jmespath v0.4.0 // indirect
	github.com/klauspost/compress v1.17.0 // indirect
	github.com/kylelemons/godebug v1.1.0 // indirect
	github.com/labstack/gommon v0.4.2 // indirect
	github.com/mattn/go-colorable v0.1.13 // indirect
	github.com/mattn/go-isatty v0.0.20 // indirect
	github.com/mattn/goveralls v0.0.12 // indirect
	github.com/mitchellh/copystructure v1.2.0 // indirect
	github.com/mitchellh/reflectwalk v1.0.2 // indirect
	github.com/moby/docker-image-spec v1.3.1 // indirect
	github.com/nxadm/tail v1.4.11 // indirect
	github.com/onsi/ginkgo v1.16.5 // indirect
	github.com/opencontainers/runtime-spec v1.0.2 // indirect
	github.com/pbnjay/memory v0.0.0-20210728143218-7b4eea64cf58 // indirect
	github.com/pkg/browser v0.0.0-20240102092130-5ac0b6a4141c // indirect
	github.com/planetscale/vtprotobuf v0.6.1-0.20240319094008-0393e58bdf10 // indirect
	github.com/russross/blackfriday/v2 v2.1.0 // indirect
	github.com/sagikazarmark/locafero v0.4.0 // indirect
	github.com/sagikazarmark/slog-shim v0.1.0 // indirect
	github.com/sercand/kuberesolver/v5 v5.1.1 // indirect
	github.com/shopspring/decimal v1.4.0 // indirect
	github.com/sirupsen/logrus v1.9.3 // indirect
	github.com/sourcegraph/conc v0.3.0 // indirect
	github.com/standard-webhooks/standard-webhooks/libraries v0.0.0-20260114220421-3f69fd681bb0 // indirect
	github.com/tidwall/match v1.1.1 // indirect
	github.com/tidwall/pretty v1.2.1 // indirect
	github.com/tidwall/sjson v1.2.5 // indirect
	github.com/uptrace/opentelemetry-go-extra/otelsql v0.3.2 // indirect
	github.com/urfave/cli/v2 v2.27.7 // indirect
	github.com/xrash/smetrics v0.0.0-20240521201337-686a1a2994c1 // indirect
	go.opentelemetry.io/auto/sdk v1.1.0 // indirect
	go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp v0.58.0 // indirect
	go.opentelemetry.io/otel/sdk/metric v1.32.0 // indirect
	golang.org/x/mod v0.29.0 // indirect
	golang.org/x/telemetry v0.0.0-20251008203120-078029d740a8 // indirect
	golang.org/x/tools v0.38.0 // indirect
	golang.org/x/tools/cmd/cover v0.1.0-deprecated // indirect
)

require (
	cloud.google.com/go/compute/metadata v0.6.0 // indirect
	cloud.google.com/go/trace v1.11.3 // indirect
	github.com/GoogleCloudPlatform/opentelemetry-operations-go/detectors/gcp v1.25.0 // indirect
	github.com/GoogleCloudPlatform/opentelemetry-operations-go/exporter/trace v1.21.0 // indirect
	github.com/GoogleCloudPlatform/opentelemetry-operations-go/internal/resourcemapping v0.49.0 // indirect
	github.com/GoogleCloudPlatform/opentelemetry-operations-go/propagator v0.45.0 // indirect
	github.com/beorn7/perks v1.0.1 // indirect
	github.com/blendle/zapdriver v1.3.2-0.20200203083823-9200777f8a3d // indirect
	github.com/bobg/go-generics/v2 v2.2.2
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/chzyer/readline v1.5.1 // indirect
	github.com/davecgh/go-spew v1.1.2-0.20180830191138-d8f796af33cc // indirect
	github.com/fsnotify/fsnotify v1.7.0 // indirect
	github.com/go-logr/logr v1.4.2 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/golang/groupcache v0.0.0-20210331224755-41bb18bfe9da // indirect
	github.com/golang/protobuf v1.5.4 // indirect
	github.com/google/s2a-go v0.1.9 // indirect
	github.com/googleapis/enterprise-certificate-proxy v0.3.4 // indirect
	github.com/googleapis/gax-go/v2 v2.14.1 // indirect
	github.com/gorilla/mux v1.8.1 // indirect
	github.com/grpc-ecosystem/go-grpc-middleware v1.4.0 // indirect
	github.com/hashicorp/errwrap v1.1.0 // indirect
	github.com/hashicorp/go-multierror v1.1.1
	github.com/hashicorp/hcl v1.0.0 // indirect
	github.com/inconshreveable/mousetrap v1.1.0 // indirect
	github.com/lithammer/dedent v1.1.0 // indirect
	github.com/logrusorgru/aurora v2.0.3+incompatible // indirect
	github.com/magiconair/properties v1.8.7 // indirect
	github.com/manifoldco/promptui v0.9.0 // indirect
	github.com/mitchellh/go-testing-interface v1.14.1 // indirect
	github.com/mitchellh/mapstructure v1.5.0 // indirect
	github.com/openzipkin/zipkin-go v0.4.2 // indirect
	github.com/patrickmn/go-cache v2.1.0+incompatible // indirect
	github.com/paulbellamy/ratecounter v0.2.0 // indirect
	github.com/pelletier/go-toml/v2 v2.1.1 // indirect
	github.com/pmezard/go-difflib v1.0.1-0.20181226105442-5d4384ee4fb2 // indirect
	github.com/pquerna/cachecontrol v0.2.0 // indirect
	github.com/prometheus/client_golang v1.18.0 // indirect
	github.com/prometheus/client_model v0.6.0 // indirect
	github.com/prometheus/common v0.46.0 // indirect
	github.com/prometheus/procfs v0.12.0 // indirect
	github.com/sethvargo/go-retry v0.2.4 // indirect
	github.com/spf13/afero v1.11.0 // indirect
	github.com/spf13/cast v1.7.0 // indirect
	github.com/streamingfast/dtracing v0.0.0-20220305214756-b5c0e8699839 // indirect
	github.com/streamingfast/sf-tracing v0.0.0-20241030160624-a1fbb2fc5f1d
	github.com/subosito/gotenv v1.6.0 // indirect
	github.com/teris-io/shortid v0.0.0-20220617161101-71ec9f2aa569 // indirect
	go.opencensus.io v0.24.0 // indirect
	go.opentelemetry.io/contrib/detectors/gcp v1.33.0 // indirect
	go.opentelemetry.io/otel/exporters/stdout/stdouttrace v1.23.1 // indirect
	go.opentelemetry.io/otel/exporters/zipkin v1.23.1 // indirect
	go.opentelemetry.io/otel/metric v1.34.0 // indirect
	go.opentelemetry.io/otel/sdk v1.33.0 // indirect
	go.opentelemetry.io/otel/trace v1.34.0 // indirect
	go.uber.org/atomic v1.11.0 // indirect
	golang.org/x/crypto v0.43.0 // indirect
	golang.org/x/net v0.46.0 // indirect
	golang.org/x/sync v0.17.0 // indirect
	golang.org/x/sys v0.37.0 // indirect
	golang.org/x/term v0.36.0 // indirect
	golang.org/x/text v0.30.0
	google.golang.org/api v0.218.0 // indirect
	google.golang.org/appengine v1.6.8 // indirect
	google.golang.org/genproto v0.0.0-20250122153221-138b5a5a4fd4 // indirect
	google.golang.org/genproto/googleapis/api v0.0.0-20250124145028-65684f501c47 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20250124145028-65684f501c47 // indirect
	gopkg.in/ini.v1 v1.67.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
)

tool github.com/abice/go-enum
