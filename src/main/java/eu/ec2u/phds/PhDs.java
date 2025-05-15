/*
 * Copyright © 2025 EC2U Alliance
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package eu.ec2u.phds;

import com.metreeca.flow.Locator;
import com.metreeca.flow.gcp.GCPServer;
import com.metreeca.flow.gcp.services.GCPVault;
import com.metreeca.flow.http.handlers.Delegator;
import com.metreeca.flow.http.handlers.Router;
import com.metreeca.flow.http.handlers.Worker;
import com.metreeca.flow.http.handlers.Wrapper;
import com.metreeca.flow.http.services.Fetcher;
import com.metreeca.flow.services.Cache;

import java.nio.file.Paths;

import static com.metreeca.flow.Locator.path;
import static com.metreeca.flow.http.Handler.handler;
import static com.metreeca.flow.http.Response.OK;
import static com.metreeca.flow.http.services.Fetcher.fetcher;
import static com.metreeca.flow.json.formats.JSON.codec;
import static com.metreeca.flow.services.Cache.cache;
import static com.metreeca.flow.services.Vault.vault;
import static com.metreeca.mesh.json.JSONCodec.json;
import static com.metreeca.shim.Loggers.logging;
import static com.metreeca.shim.URIs.uri;

import static java.time.Duration.ofDays;
import static java.util.logging.Level.INFO;

public final class PhDs extends Delegator {

    private static final String BASE="https://phds.ec2u.eu/";

    private static final boolean PRODUCTION=GCPServer.production();


    static {
        logging(INFO);
    }


    //̸/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    public static Locator services(final Locator locator) {
        return locator

                .set(vault(), GCPVault::new)

                .set(path(), () -> Paths.get(PRODUCTION ? "/tmp" : "data"))
                .set(cache(), () -> new Cache.FileCache().ttl(ofDays(1)))
                .set(fetcher(), () -> PRODUCTION ? new Fetcher.URLFetcher() : new Fetcher.CacheFetcher())


                .set(codec(), () -> json()
                        .prune(true)
                        .indent(true)
                        .base(uri(BASE))
                );
    }


    public static void main(final String... args) {
        new GCPServer().delegate(locator -> services(locator).get(PhDs::new)).start();
    }

    public static void exec(final Runnable task) {
        try ( final Locator locator=services(new Locator()) ) { locator.exec(task); }
    }


    //̸/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    private PhDs() {
        delegate(handler(

                new Wrapper() // after publisher

                        .before(request -> request.base(BASE)), // define canonical base

                new Router()
                        .path("/*", new Worker()
                                .get((request, forward) -> request.reply(OK, "ciao!")))

        ));
    }

}
